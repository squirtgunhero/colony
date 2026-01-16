// ============================================================================
// useVoiceInput - Web Speech API Hook for Voice Input
// Provides speech-to-text functionality with browser-native API
// ============================================================================

"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface UseVoiceInputOptions {
  /** Language for speech recognition (default: 'en-US') */
  language?: string;
  /** Whether to use continuous recognition (default: false) */
  continuous?: boolean;
  /** Callback when transcript is finalized */
  onResult?: (transcript: string) => void;
  /** Callback when interim results are available */
  onInterimResult?: (transcript: string) => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

export interface UseVoiceInputReturn {
  /** Whether the browser supports speech recognition */
  isSupported: boolean;
  /** Whether currently listening */
  isListening: boolean;
  /** Current transcript (interim or final) */
  transcript: string;
  /** Start listening */
  startListening: () => void;
  /** Stop listening */
  stopListening: () => void;
  /** Toggle listening state */
  toggleListening: () => void;
  /** Clear transcript */
  clearTranscript: () => void;
  /** Error message if any */
  error: string | null;
}

// Type for the Web Speech API (not fully typed in TypeScript)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

type SpeechRecognitionType = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
};

function getSpeechRecognition(): SpeechRecognitionType | null {
  if (typeof window === "undefined") return null;
  
  // Check for browser support
  const SpeechRecognition =
    (window as unknown as { SpeechRecognition?: SpeechRecognitionType }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionType }).webkitSpeechRecognition;
  
  return SpeechRecognition || null;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const {
    language = "en-US",
    continuous = false,
    onResult,
    onInterimResult,
    onError,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<InstanceType<SpeechRecognitionType> | null>(null);

  // Check for support on mount
  useEffect(() => {
    const SpeechRecognition = getSpeechRecognition();
    setIsSupported(!!SpeechRecognition);
  }, []);

  // Initialize recognition
  const initRecognition = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(finalTranscript);
        onResult?.(finalTranscript);
      } else if (interimTranscript) {
        setTranscript(interimTranscript);
        onInterimResult?.(interimTranscript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMessage = getErrorMessage(event.error);
      setError(errorMessage);
      setIsListening(false);
      onError?.(errorMessage);
    };

    return recognition;
  }, [continuous, language, onResult, onInterimResult, onError]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError("Speech recognition is not supported in this browser");
      return;
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    // Create new recognition instance
    const recognition = initRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    setTranscript("");
    setError(null);

    try {
      recognition.start();
    } catch (err) {
      setError("Failed to start speech recognition");
      console.error("Speech recognition error:", err);
    }
  }, [isSupported, initRecognition]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const clearTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
    error,
  };
}

function getErrorMessage(error: string): string {
  switch (error) {
    case "no-speech":
      return "No speech detected. Please try again.";
    case "audio-capture":
      return "No microphone found. Please check your audio settings.";
    case "not-allowed":
      return "Microphone access denied. Please allow microphone access.";
    case "network":
      return "Network error. Please check your connection.";
    case "aborted":
      return "Speech recognition was aborted.";
    case "language-not-supported":
      return "Language not supported.";
    case "service-not-allowed":
      return "Speech recognition service not allowed.";
    default:
      return `Speech recognition error: ${error}`;
  }
}

