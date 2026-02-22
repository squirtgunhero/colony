"use client";

import { useState, useCallback, useRef, useEffect } from "react";

const MAX_RECORDING_MS = 30_000;

export interface UseVoiceInputOptions {
  language?: string;
  continuous?: boolean;
  onResult?: (transcript: string) => void;
  onInterimResult?: (transcript: string) => void;
  onError?: (error: string) => void;
}

export interface UseVoiceInputReturn {
  isSupported: boolean;
  isListening: boolean;
  isTranscribing: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  clearTranscript: () => void;
  error: string | null;
}

function checkMediaRecorderSupport(): boolean {
  if (typeof window === "undefined") return false;
  return typeof navigator?.mediaDevices?.getUserMedia === "function" &&
    typeof window.MediaRecorder === "function";
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const { onResult, onError } = options;

  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsSupported(checkMediaRecorderSupport());
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const transcribe = useCallback(
    async (blob: Blob) => {
      setIsTranscribing(true);
      try {
        const form = new FormData();
        form.append("audio", blob, "recording.webm");

        const res = await fetch("/api/voice/transcribe", {
          method: "POST",
          body: form,
        });

        if (!res.ok) {
          throw new Error(`${res.status}`);
        }

        const data = await res.json();
        const text = (data.text ?? "").trim();

        if (!text) {
          const msg = "Didn't catch that. Try again.";
          setError(msg);
          onError?.(msg);
          return;
        }

        setTranscript(text);
        onResult?.(text);
      } catch {
        const msg = "Voice isn't working right now. Type your request instead.";
        setError(msg);
        onError?.(msg);
      } finally {
        setIsTranscribing(false);
      }
    },
    [onResult, onError]
  );

  const stopListening = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    setIsListening(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startListening = useCallback(async () => {
    if (!isSupported) return;

    cleanup();
    setError(null);
    setTranscript("");
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const tracks = streamRef.current?.getTracks();
        tracks?.forEach((t) => t.stop());
        streamRef.current = null;

        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          transcribe(blob);
        }
        chunksRef.current = [];
      };

      recorder.start();
      setIsListening(true);

      timerRef.current = setTimeout(() => {
        stopListening();
      }, MAX_RECORDING_MS);
    } catch (err) {
      cleanup();
      const domErr = err as DOMException;
      if (domErr.name === "NotAllowedError" || domErr.name === "PermissionDeniedError") {
        const msg =
          "Colony needs mic access to use voice. Check your browser settings.";
        setError(msg);
        onError?.(msg);
      } else {
        const msg = "Could not access microphone.";
        setError(msg);
        onError?.(msg);
      }
    }
  }, [isSupported, cleanup, transcribe, stopListening, onError]);

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

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isSupported,
    isListening,
    isTranscribing,
    transcript,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
    error,
  };
}
