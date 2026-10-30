import { useState, useEffect, useRef, useCallback } from 'react';

// Browser Web Speech API type definitions for TypeScript
export interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

export interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

export interface UseSpeechRecognitionOptions {
  lang?: string;
  onTranscriptChange?: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
}

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  permissionDenied: boolean;
}

/**
 * Custom hook for browser-native speech recognition via Web Speech API.
 * Supports window.SpeechRecognition and window.webkitSpeechRecognition.
 */
export const useSpeechRecognition = (
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn => {
  const { lang = 'en-IN', onTranscriptChange, onFinalTranscript } = options;

  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const isExplicitStopRef = useRef<boolean>(false);

  // Detect support on mount
  useEffect(() => {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionClass);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          isExplicitStopRef.current = true;
          recognitionRef.current.abort();
        } catch {
          // Ignore abort errors on unmount
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      isExplicitStopRef.current = true;
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors if already stopped
      }
      setIsListening(false);
      setInterimTranscript('');
    }
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    setTranscript('');
    setInterimTranscript('');

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setError('Speech recognition is not supported in this browser. Please type your instruction.');
      return;
    }

    // Stop existing session if active to prevent overlapping sessions
    if (recognitionRef.current) {
      try {
        isExplicitStopRef.current = true;
        recognitionRef.current.abort();
      } catch {
        // Ignore abort errors
      }
      recognitionRef.current = null;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;
      isExplicitStopRef.current = false;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = '';
        let finalSegment = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const text = res[0]?.transcript || '';
          if (res.isFinal) {
            finalSegment += text;
          } else {
            interim += text;
          }
        }

        if (finalSegment) {
          const trimmedSegment = finalSegment.trim();
          setTranscript((prev) => {
            const combined = prev ? `${prev.trim()} ${trimmedSegment}` : trimmedSegment;
            if (onTranscriptChange) onTranscriptChange(combined);
            return combined;
          });
          if (onFinalTranscript) onFinalTranscript(trimmedSegment);
          setInterimTranscript('');
        } else if (interim) {
          setInterimTranscript(interim);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false);
        setInterimTranscript('');

        switch (event.error) {
          case 'not-allowed':
          case 'permission-denied':
            setPermissionDenied(true);
            setError('Microphone permission was denied. Please allow microphone access in your browser settings to use voice commands.');
            break;
          case 'no-speech':
            // No speech detected, not fatal
            setError('No speech was detected. Please click the microphone and try again.');
            break;
          case 'audio-capture':
            setError('No microphone found or audio capture device is unavailable.');
            break;
          case 'network':
            setError('Network communication error occurred with the speech recognition service.');
            break;
          case 'aborted':
            // User stopped or session was aborted - do not show error
            break;
          default:
            setError(`Speech recognition error: ${event.error}`);
            break;
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setIsListening(false);
      setError(err.message || 'Could not initialize speech recognition');
    }
  }, [lang, onTranscriptChange, onFinalTranscript]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    permissionDenied
  };
};
