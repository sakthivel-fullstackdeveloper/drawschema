import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseSpeechSynthesisOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

export interface UseSpeechSynthesisReturn {
  isSupported: boolean;
  isSpeaking: boolean;
  speak: (text: string) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

/**
 * Custom hook for browser-native speech synthesis via Web Speech API window.speechSynthesis.
 * 
 * Provides:
 * - speak(text): Cancels any ongoing utterance and speaks text cleanly.
 * - stop(): Immediately stops speech output (essential for user interruption).
 * - isSpeaking: Visible speaking state indicator for UI copilot avatars.
 */
export const useSpeechSynthesis = (
  options: UseSpeechSynthesisOptions = {}
): UseSpeechSynthesisReturn => {
  const { lang = 'en-IN', rate = 1.2, pitch = 1.0, onEnd, onError } = options;

  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const selectedMaleVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    setIsSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const pickMaleVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;

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

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      currentUtteranceRef.current = null;
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    if (!text || !text.trim()) {
      return;
    }

    // Natural Interruption: cancel any currently playing audio immediately
    window.speechSynthesis.cancel();

    try {
      const cleanText = text
        .replace(/[*_#`]/g, '') // remove markdown symbols for clean speech
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = lang;
      utterance.rate = rate; // defaults to 1.2
      utterance.pitch = pitch;

      if (selectedMaleVoiceRef.current) {
        utterance.voice = selectedMaleVoiceRef.current;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        currentUtteranceRef.current = null;
        if (onEnd) onEnd();
      };

      utterance.onerror = (e) => {
        // Cancelled/interrupted errors are intentional when user interrupts
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          console.warn('Speech synthesis error:', e.error);
          if (onError) onError(e);
        }
        setIsSpeaking(false);
        currentUtteranceRef.current = null;
      };

      currentUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Could not speak response:', err);
      setIsSpeaking(false);
    }
  }, [lang, rate, pitch, onEnd, onError]);

  const pause = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
  }, []);

  const resume = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
  }, []);

  // Cleanup on unmount: stop any active voice playback
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    isSupported,
    isSpeaking,
    speak,
    stop,
    pause,
    resume
  };
};
