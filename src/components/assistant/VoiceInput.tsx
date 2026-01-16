"use client";

// ============================================================================
// VoiceInput - Microphone Button for Voice Commands
// Animated button that captures speech and converts to text
// ============================================================================

import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useEffect } from "react";

interface VoiceInputProps {
  /** Called when speech is finalized */
  onTranscript: (text: string) => void;
  /** Called with interim results (optional) */
  onInterimTranscript?: (text: string) => void;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

export function VoiceInput({
  onTranscript,
  onInterimTranscript,
  disabled = false,
  className,
}: VoiceInputProps) {
  const {
    isSupported,
    isListening,
    transcript,
    toggleListening,
    error,
  } = useVoiceInput({
    language: "en-US",
    continuous: false,
    onResult: (text) => {
      onTranscript(text);
    },
    onInterimResult: (text) => {
      onInterimTranscript?.(text);
    },
  });

  // Show error as toast or console
  useEffect(() => {
    if (error) {
      console.warn("Voice input error:", error);
    }
  }, [error]);

  // Don't render if not supported
  if (!isSupported) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      disabled={disabled}
      title={isListening ? "Stop listening" : "Voice input"}
      className={cn(
        "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
        "transition-all duration-200",
        isListening
          ? "bg-red-500 text-white hover:bg-red-600 scale-110"
          : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      aria-label={isListening ? "Stop voice input" : "Start voice input"}
    >
      {/* Pulsing ring animation when listening */}
      {isListening && (
        <>
          <span className="absolute inset-0 rounded-xl bg-red-500 animate-ping opacity-30" />
          <span className="absolute inset-0 rounded-xl bg-red-500/20 animate-pulse" />
        </>
      )}

      {/* Icon */}
      {isListening ? (
        <Mic className="h-4 w-4 relative z-10 animate-pulse" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </button>
  );
}

// ============================================================================
// VoiceInputIndicator - Shows listening state with transcript preview
// ============================================================================

interface VoiceInputIndicatorProps {
  isListening: boolean;
  transcript: string;
  onCancel: () => void;
}

export function VoiceInputIndicator({
  isListening,
  transcript,
  onCancel,
}: VoiceInputIndicatorProps) {
  if (!isListening && !transcript) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 px-4">
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl",
          "bg-card/95 backdrop-blur-xl border border-border",
          "shadow-lg",
          "animate-in slide-in-from-bottom-2 duration-200"
        )}
      >
        {/* Listening indicator */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Mic className="h-5 w-5 text-red-500" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          </div>
          <span className="text-sm font-medium text-red-500">Listening...</span>
        </div>

        {/* Transcript preview */}
        {transcript && (
          <div className="flex-1 text-sm text-muted-foreground truncate">
            "{transcript}"
          </div>
        )}

        {/* Cancel button */}
        <button
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}





