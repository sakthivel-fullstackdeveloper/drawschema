import { useState, useEffect, useRef, useCallback } from 'react';

export type VoiceSessionState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'user_speaking'
  | 'processing'
  | 'assistant_speaking'
  | 'executing'
  | 'awaiting_confirmation'
  | 'interrupted'
  | 'error'
  | 'disconnected';

export interface UseVoiceSessionOptions {
  lang?: string;
  voiceOutputEnabled?: boolean;
  onInterrupted?: (reason: string) => void;
  onFinalTranscript?: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  onError?: (error: string) => void;
  autoLoop?: boolean; // When true, automatically resumes listening after assistant finishes speaking
}

export interface UseVoiceSessionReturn {
  sessionState: VoiceSessionState;
  isSessionActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  interimTranscript: string;
  finalTranscript: string;
  audioLevel: number;
  error: string | null;
  startSession: () => Promise<void>;
  stopSession: () => void;
  interrupt: (reason?: string) => void;
  setProcessingState: (processing: boolean) => void;
  setExecutingState: (executing: boolean) => void;
  setAwaitingConfirmationState: () => void;
  speak: (text: string, onEnd?: () => void) => void;
  stopSpeaking: () => void;
  clearTranscript: () => void;
}

/**
 * useVoiceSession
 * 
 * Provides an always-ready, continuous full-duplex conversational voice loop:
 * - Single Start Conversation action keeps the mic capture active across multiple conversational turns.
 * - Automatic speech-onset and end-of-turn detection.
 * - Automatic resumption of listening when assistant finishes speaking.
 * - Natural barge-in interruption during speech synthesis.
 * - Full cleanup on explicit stop or unmount.
 */
export const useVoiceSession = (
  options: UseVoiceSessionOptions = {}
): UseVoiceSessionReturn => {
  const {
    lang = 'en-IN',
    voiceOutputEnabled = true,
    autoLoop = true,
    onInterrupted,
    onFinalTranscript,
    onInterimTranscript,
    onError
  } = options;

  const [sessionState, setSessionState] = useState<VoiceSessionState>('idle');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [finalTranscript, setFinalTranscript] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // References for Web APIs
  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadAnimationRef = useRef<number | null>(null);
  const isExplicitStopRef = useRef<boolean>(true);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const stateRef = useRef<VoiceSessionState>('idle');
  const selectedMaleVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // VAD onset confirmation counters — require sustained energy to detect possible speech activity
  const onsetCounterRef = useRef<number>(0);
  // Continuous adaptive noise floor baseline: tracks environmental background (fans, AC, room hum)
  const noiseFloorRef = useRef<number>(15);
  const noiseFloorSamplesRef = useRef<number[]>([]);
  const noiseFloorReadyRef = useRef<boolean>(false);

  // Deduplication: track last submitted final transcript to avoid re-processing on recognition restart.
  const lastSubmittedTranscriptRef = useRef<string>('');

  // Session generation counter — incremented on every startSession() and every interrupt().
  // Each async callback (utterance.onend, utterance.onerror, recognition.onend, setTimeout) captures
  // its generation at creation time and no-ops if the current generation has advanced past it.
  // This prevents stale callbacks from a cancelled speak() call corrupting the new barge-in session.
  const sessionGenerationRef = useRef<number>(0);

  // Synchronize stateRef
  useEffect(() => {
    stateRef.current = sessionState;
  }, [sessionState]);

  // Select a consistent male voice for DrawSchema AI
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const pickMaleVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;

      // Prioritize English male voices across platforms:
      // 1. Explicit male voices by name (Google UK English Male, Microsoft David, Guy, George, Ryan, etc.)
      // 2. English voices containing 'male' and NOT 'female'
      // 3. Any standard English voice that is known to be male or neutral male
      const maleVoice =
        voices.find((v) => /Google UK English Male|Microsoft (David|Guy|George|Ryan|Mark|James|Richard)/i.test(v.name)) ||
        voices.find((v) => v.lang.startsWith('en') && /male/i.test(v.name) && !/female/i.test(v.name)) ||
        voices.find((v) => /Daniel|Oliver|Arthur|Thomas|Alex|Fred|Aaron/i.test(v.name)) ||
        voices.find((v) => v.lang.startsWith('en') && !/female|zira|susan|catherine|hazel|samantha|victoria|karen/i.test(v.name)) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0];

      if (maleVoice) {
        selectedMaleVoiceRef.current = maleVoice;
      }
    };

    pickMaleVoice();
    window.speechSynthesis.onvoiceschanged = pickMaleVoice;

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Clean stop for audio synthesis
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      activeUtteranceRef.current = null;
    }
  }, []);

  // Barge-In Interruption Handler
  const interrupt = useCallback((reason: string = 'User barge-in') => {
    // Advance the generation counter FIRST so all stale utterance.onend / utterance.onerror
    // callbacks that were created by the cancelled speak() call will detect the mismatch
    // and no-op — preventing them from overwriting the new barge-in session state.
    const interruptGeneration = ++sessionGenerationRef.current;
    console.log(`[SESSION gen=${interruptGeneration}] interrupt() — reason: ${reason}`);

    // 1. Immediately silence spoken audio (fires utterance.onerror with 'interrupted' async)
    stopSpeaking();

    // 2. Notify parent listener to abort active reasoning request and increment turn/request ID
    if (onInterrupted) {
      onInterrupted(reason);
    }

    // 3. Update state machine — transition directly to 'interrupted' then immediately to 'listening'
    //    if recognition is active.  No setTimeout needed (that caused a double-write race with the
    //    stale utterance.onerror callback that also tries to setSessionState after cancel).
    setSessionState('interrupted');

    if (!isExplicitStopRef.current && recognitionRef.current) {
      // Recognition is still alive — go straight to listening so the user's barge-in words are captured.
      console.log(`[SESSION gen=${interruptGeneration}] interrupt() → transitioning to listening`);
      setSessionState('listening');
    } else if (isExplicitStopRef.current) {
      setSessionState('idle');
    }
  }, [stopSpeaking, onInterrupted]);

  // Audio synthesis output with automatic transition back to listening
  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!voiceOutputEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (!isExplicitStopRef.current && autoLoop) {
        setSessionState('listening');
      }
      if (onEnd) onEnd();
      return;
    }

    if (!text || !text.trim()) {
      if (!isExplicitStopRef.current && autoLoop) {
        setSessionState('listening');
      }
      if (onEnd) onEnd();
      return;
    }

    // Stop any existing speech
    stopSpeaking();

    // Capture generation at the moment speak() is called.  If interrupt() fires before
    // utterance.onend / utterance.onerror, the generation counter will have advanced and these
    // callbacks will detect the stale generation and no-op instead of overwriting session state.
    const speakGeneration = sessionGenerationRef.current;
    console.log(`[TTS gen=${speakGeneration}] speak() — starting synthesis`);

    try {
      const cleanText = text.replace(/[*_#`]/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = lang;
      // Fixed speaking rate: 1.2x speed for natural, responsive, and efficient explanations
      utterance.rate = 1.2;
      utterance.pitch = 1.0;

      if (selectedMaleVoiceRef.current) {
        utterance.voice = selectedMaleVoiceRef.current;
      }

      utterance.onstart = () => {
        if (sessionGenerationRef.current !== speakGeneration) {
          console.log(`[TTS gen=${speakGeneration}] onstart ignored — generation stale (current=${sessionGenerationRef.current})`);
          return;
        }
        setSessionState('assistant_speaking');
      };

      utterance.onend = () => {
        activeUtteranceRef.current = null;
        if (sessionGenerationRef.current !== speakGeneration) {
          // This speak() was cancelled by interrupt() — do NOT overwrite the new barge-in state.
          console.log(`[TTS gen=${speakGeneration}] onend ignored — stale (current=${sessionGenerationRef.current})`);
          return;
        }
        console.log(`[TTS gen=${speakGeneration}] onend — natural completion, resuming listening`);
        // Automatic conversation loop: transition seamlessly back to listening without requiring mic click!
        if (!isExplicitStopRef.current && autoLoop) {
          setSessionState('listening');
        } else if (isExplicitStopRef.current) {
          setSessionState('idle');
        }
        if (onEnd) onEnd();
      };

      utterance.onerror = (e) => {
        activeUtteranceRef.current = null;
        if (sessionGenerationRef.current !== speakGeneration) {
          // Expected: this fires as 'interrupted'/'canceled' because interrupt() called stopSpeaking().
          // The new session state has already been set by interrupt() — do NOT overwrite it here.
          console.log(`[TTS gen=${speakGeneration}] onerror('${e.error}') ignored — stale (current=${sessionGenerationRef.current})`);
          return;
        }
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          console.warn(`[TTS gen=${speakGeneration}] Speech synthesis error:`, e.error);
        }
        // Auto-resume listening even if speech was cancelled or finished
        if (!isExplicitStopRef.current && autoLoop) {
          setSessionState('listening');
        } else if (isExplicitStopRef.current) {
          setSessionState('idle');
        }
        if (onEnd) onEnd();
      };

      activeUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('[TTS] Failed to speak text:', err);
      if (!isExplicitStopRef.current && autoLoop) {
        setSessionState('listening');
      }
      if (onEnd) onEnd();
    }
  }, [voiceOutputEnabled, autoLoop, lang, stopSpeaking]);

  // Cleanup Web Audio & VAD loop
  const cleanupAudioVAD = useCallback(() => {
    if (vadAnimationRef.current) {
      cancelAnimationFrame(vadAnimationRef.current);
      vadAnimationRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {
        // Ignore close errors
      }
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    analyserRef.current = null;
    onsetCounterRef.current = 0;
    noiseFloorRef.current = 0;
    noiseFloorSamplesRef.current = [];
    noiseFloorReadyRef.current = false;
    setAudioLevel(0);
  }, []);

  // Voice Activity Detection (VAD) via Web Audio AnalyserNode
  const setupAudioVAD = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((average / 128) * 100));
        setAudioLevel(normalized);

        // ── Adaptive Noise-Floor Tracking ────────────────────────────────────
        // Initial calibration: sample first 30 frames (~500ms) to establish room baseline
        if (!noiseFloorReadyRef.current) {
          noiseFloorSamplesRef.current.push(normalized);
          if (noiseFloorSamplesRef.current.length >= 30) {
            const sum30 = noiseFloorSamplesRef.current.reduce((a, b) => a + b, 0);
            noiseFloorRef.current = Math.max(10, Math.round(sum30 / noiseFloorSamplesRef.current.length));
            noiseFloorReadyRef.current = true;
            console.log('[VAD] Initial noise floor calibrated:', noiseFloorRef.current);
          }
          vadAnimationRef.current = requestAnimationFrame(checkVolume);
          return;
        }

        // Continuous slow adaptation: adapt to changing ambient noise (e.g. fan speeds)
        // when audio is relatively steady and assistant is not speaking
        if (stateRef.current !== 'assistant_speaking' && stateRef.current !== 'user_speaking') {
          // Slow moving average alpha = 0.02
          noiseFloorRef.current = noiseFloorRef.current * 0.98 + normalized * 0.02;
        }

        // ── Voice Activity Monitoring ─────────────────────────────────────────
        // NOTE: VAD level alone DOES NOT stop assistant playback!
        // Stopping assistant playback strictly requires confirmed speech recognition
        // (see recognition.onresult validation).
        // VAD here is used for UI indicator and tracking potential speech onset.
        const speechThreshold = Math.max(30, noiseFloorRef.current + 18);
        if (normalized > speechThreshold) {
          onsetCounterRef.current += 1;
        } else {
          onsetCounterRef.current = Math.max(0, onsetCounterRef.current - 1);
        }

        vadAnimationRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err: any) {
      console.warn('Could not initialize audio VAD analyser:', err.message);
    }
  }, [interrupt]);

  // Clean stop for complete session (triggered by "End Conversation" button)
  const stopSession = useCallback(() => {
    isExplicitStopRef.current = true;
    stopSpeaking();
    cleanupAudioVAD();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore abort errors
      }
      recognitionRef.current = null;
    }

    setSessionState('idle');
    setInterimTranscript('');
  }, [stopSpeaking, cleanupAudioVAD]);

  // Start persistent voice session
  const startSession = useCallback(async () => {
    setError(null);
    setInterimTranscript('');
    setFinalTranscript('');
    lastSubmittedTranscriptRef.current = '';
    isExplicitStopRef.current = false;
    setSessionState('connecting');

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      const msg = 'Speech recognition not supported in this browser. Please use Chrome or Edge.';
      setError(msg);
      setSessionState('error');
      if (onError) onError(msg);
      return;
    }

    // Stop existing session cleanly
    stopSession();
    isExplicitStopRef.current = false;
    sessionGenerationRef.current += 1;
    console.log(`[SESSION gen=${sessionGenerationRef.current}] startSession() initiated`);

    // Initialize VAD for barge-in volume sensing
    await setupAudioVAD();

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;
      // maxAlternatives=1 reduces internal processing overhead and speeds up result delivery
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setSessionState('listening');
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalized = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const text = res[0]?.transcript || '';
          if (res.isFinal) {
            finalized += text;
          } else {
            interim += text;
          }
        }

        // Helper: Validate if transcript contains genuine human speech words
        // Rejects non-speech artifacts, empty strings, punctuation, or single random letters
        const isGenuineSpeech = (str: string): boolean => {
          if (!str) return false;
          const cleaned = str.trim();
          if (cleaned.length < 2) return false;
          // Must contain at least one word of 2+ alphanumeric characters or multiple words
          return /[a-zA-Z0-9]{2,}/.test(cleaned) || /^[a-zA-Z0-9]\s+[a-zA-Z0-9]/.test(cleaned);
        };

        // When user produces interim speech
        if (interim) {
          const trimmedInterim = interim.trim();
          setInterimTranscript(trimmedInterim);
          if (onInterimTranscript) onInterimTranscript(trimmedInterim);

          // SPEECH-CONFIRMED BARGE-IN INTERRUPTION:
          // If assistant was speaking, only interrupt if genuine human speech words are confirmed!
          // Background noise, mic pops, fan hum, keyboard clatter that produce empty/whitespace
          // or single character noise will NOT silence the assistant.
          if (stateRef.current === 'assistant_speaking' || stateRef.current === 'processing') {
            if (isGenuineSpeech(trimmedInterim)) {
              console.log('[STT] Confirmed speech barge-in:', trimmedInterim);
              interrupt(`Confirmed speech: "${trimmedInterim}"`);
            } else {
              console.log('[STT] Ignored non-speech interim noise while speaking:', trimmedInterim);
            }
          }

          setSessionState('user_speaking');
        }

        // When user finishes a segment
        if (finalized) {
          const trimmed = finalized.trim();

          // If assistant was speaking and this is the first finalized result, confirm barge-in
          if (stateRef.current === 'assistant_speaking' || stateRef.current === 'processing') {
            if (isGenuineSpeech(trimmed)) {
              interrupt(`Confirmed final speech: "${trimmed}"`);
            }
          }

          // Deduplication guard: Chrome restarts recognition internally and can re-fire the same
          // final transcript on the onresult event. Skip if we already submitted this exact text.
          if (isGenuineSpeech(trimmed) && trimmed !== lastSubmittedTranscriptRef.current) {
            lastSubmittedTranscriptRef.current = trimmed;
            setFinalTranscript((prev) => (prev ? `${prev} ${trimmed}` : trimmed));
            setInterimTranscript('');
            if (onFinalTranscript) onFinalTranscript(trimmed);
          } else if (trimmed) {
            console.log('[STT] Duplicate or non-speech final transcript suppressed:', trimmed);
            setInterimTranscript('');
          }
          // Return to listening or processing
          setSessionState('listening');
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          // Non-fatal, keep listening
          return;
        }
        if (event.error === 'aborted') {
          // Intentional abort
          return;
        }

        let userMsg = `Speech recognition error: ${event.error}`;
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          userMsg = 'Microphone permission was denied. Please allow microphone access.';
        }

        setError(userMsg);
        setSessionState('error');
        if (onError) onError(userMsg);
      };

      recognition.onend = () => {
        // Continuous session: If user didn't explicitly end session, auto-restart to stay always-ready!
        if (!isExplicitStopRef.current && stateRef.current !== 'error' && stateRef.current !== 'idle') {
          try {
            recognition.start();
            console.log('[STT] Recognition auto-restarted after onend');
          } catch (e: any) {
            if (e.name === 'InvalidStateError') {
              // Recognition is already starting (race between our restart and browser's internal lifecycle).
              // This is safe to ignore — recognition will fire onstart itself and the session stays alive.
              // DO NOT fall through to setSessionState('idle') here; that is the primary stuck-session cause.
              console.log('[STT] Restart skipped — recognition already starting (InvalidStateError, safe to ignore)');
              return;
            }
            // A real, non-recoverable recognition failure (e.g., hardware removed, permission revoked).
            console.warn('[STT] Recognition restart failed with unexpected error:', e.name, e.message);
            setSessionState('error');
          }
        } else if (isExplicitStopRef.current) {
          setSessionState('idle');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setError(err.message || 'Could not start voice session');
      setSessionState('error');
      if (onError) onError(err.message);
    }
  }, [lang, stopSession, setupAudioVAD, interrupt, onInterimTranscript, onFinalTranscript, onError]);

  // Session state helpers
  const setProcessingState = useCallback((processing: boolean) => {
    setSessionState(processing ? 'processing' : 'listening');
  }, []);

  const setExecutingState = useCallback((executing: boolean) => {
    setSessionState(executing ? 'executing' : 'listening');
  }, []);

  const setAwaitingConfirmationState = useCallback(() => {
    setSessionState('awaiting_confirmation');
  }, []);

  const clearTranscript = useCallback(() => {
    setInterimTranscript('');
    setFinalTranscript('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSession();
    };
  }, [stopSession]);

  return {
    sessionState,
    isSessionActive: !isExplicitStopRef.current && sessionState !== 'idle' && sessionState !== 'error',
    isListening: sessionState === 'listening' || sessionState === 'user_speaking',
    isSpeaking: sessionState === 'assistant_speaking',
    isProcessing: sessionState === 'processing',
    interimTranscript,
    finalTranscript,
    audioLevel,
    error,
    startSession,
    stopSession,
    interrupt,
    setProcessingState,
    setExecutingState,
    setAwaitingConfirmationState,
    speak,
    stopSpeaking,
    clearTranscript
  };
};
