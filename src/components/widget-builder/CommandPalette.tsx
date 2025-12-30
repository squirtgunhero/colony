"use client";

/**
 * Command Palette Component
 * A floating ⌘K-style assistant for natural language widget creation
 * Integrates directly into the dashboard experience
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Command, Sparkles, X, Loader2, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  onWidgetCreated?: (widget: unknown) => void;
}

// Example suggestions
const SUGGESTIONS = [
  "Add a KPI card showing new leads last 7 days",
  "Create a leads table filtered to Manhattan",
  "Show pipeline kanban grouped by stage",
  "Add a KPI card for deals this month",
];

export function CommandPalette({ onWidgetCreated }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [command, setCommand] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<WebkitSpeechRecognition | null>(null);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      // Escape to close
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join("");
        setCommand(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };
    }
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setCommand("");
    setError(null);
    setSuccess(null);
    setIsListening(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const toggleVoice = useCallback(() => {
    if (!recognitionRef.current) {
      setError("Voice input not supported in this browser");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      setError(null);
    }
  }, [isListening]);

  const handleSubmit = async () => {
    if (!command.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/widget/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: command }),
      });

      const data = await response.json();

      if (data.ok) {
        // Save the widget to layout
        await saveWidget(data.widgetSpec);
        setSuccess(`Created ${data.widgetSpec.widgetType.replace("_", " ")}!`);
        onWidgetCreated?.(data.widgetSpec);
        
        // Auto-close after success
        setTimeout(() => {
          handleClose();
        }, 1500);
      } else {
        setError(data.error || "Failed to create widget");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const saveWidget = async (widgetSpec: unknown) => {
    // Load current layout
    const layoutRes = await fetch("/api/layout?pageId=home");
    const currentLayout = await layoutRes.json();

    // Add new widget
    const widgets = [...(currentLayout.widgets || []), widgetSpec];
    
    // Save updated layout
    await fetch("/api/layout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageId: "home",
        userId: "demo-user",
        widgets,
        gridLayout: currentLayout.gridLayout || { left: [], main: [], right: [] },
      }),
    });
  };

  const handleSuggestionClick = (suggestion: string) => {
    setCommand(suggestion);
    inputRef.current?.focus();
  };

  if (!isOpen) {
    // Floating trigger button
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-neutral-900 text-white rounded-full shadow-lg hover:bg-neutral-800 transition-all hover:scale-105 group"
      >
        <Sparkles className="h-5 w-5" />
        <span className="font-medium">Ask AI</span>
        <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-neutral-700 rounded ml-2">
          <Command className="h-3 w-3" />K
        </kbd>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleClose}
      />

      {/* Command Palette Modal */}
      <div className="fixed inset-x-4 top-[20%] z-50 mx-auto max-w-2xl animate-in slide-in-from-top-4 fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <span className="text-sm font-medium text-neutral-600">AI Assistant</span>
            <div className="flex-1" />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs text-neutral-500 bg-neutral-100 rounded">
              ESC to close
            </kbd>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-neutral-100 rounded-md transition-colors"
            >
              <X className="h-4 w-4 text-neutral-400" />
            </button>
          </div>

          {/* Input Area */}
          <div className="p-4">
            <div className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors",
              error ? "border-red-300 bg-red-50" : 
              success ? "border-green-300 bg-green-50" :
              isListening ? "border-amber-300 bg-amber-50" :
              "border-neutral-200 focus-within:border-neutral-400"
            )}>
              {isLoading ? (
                <Loader2 className="h-5 w-5 text-neutral-400 animate-spin" />
              ) : (
                <Sparkles className={cn(
                  "h-5 w-5",
                  error ? "text-red-500" : 
                  success ? "text-green-500" :
                  isListening ? "text-amber-500 animate-pulse" :
                  "text-neutral-400"
                )} />
              )}
              <input
                ref={inputRef}
                type="text"
                value={command}
                onChange={(e) => {
                  setCommand(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSubmit();
                  }
                }}
                placeholder={isListening ? "Listening..." : "What would you like to add to your dashboard?"}
                className="flex-1 bg-transparent outline-none text-neutral-900 placeholder:text-neutral-400"
                disabled={isLoading}
              />
              <button
                onClick={toggleVoice}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isListening ? "bg-amber-500 text-white" : "hover:bg-neutral-100 text-neutral-400"
                )}
                title="Voice input"
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!command.trim() || isLoading}
                className="px-4 py-1.5 bg-neutral-900 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-800 transition-colors"
              >
                {isLoading ? "Creating..." : "Create"}
              </button>
            </div>

            {/* Status Messages */}
            {error && (
              <p className="mt-3 text-sm text-red-600 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
                {error}
              </p>
            )}
            {success && (
              <p className="mt-3 text-sm text-green-600 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
                {success}
              </p>
            )}
          </div>

          {/* Suggestions */}
          {!error && !success && (
            <div className="px-4 pb-4">
              <p className="text-xs font-medium text-neutral-500 mb-2">Try saying:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-3 py-1.5 text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-full transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-100">
            <p className="text-xs text-neutral-500 text-center">
              Supports KPI cards, leads tables, and pipeline kanbans • Press <kbd className="px-1 py-0.5 bg-neutral-200 rounded text-[10px]">Enter</kbd> to create
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// Type declarations for Web Speech API (webkit prefix)
declare global {
  interface Window {
    webkitSpeechRecognition: new () => WebkitSpeechRecognition;
  }
}

interface WebkitSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: WebkitSpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: WebkitSpeechRecognitionErrorEvent) => void) | null;
  start: () => void;
  stop: () => void;
}

interface WebkitSpeechRecognitionEvent {
  results: WebkitSpeechRecognitionResultList;
}

interface WebkitSpeechRecognitionResultList {
  readonly length: number;
  item(index: number): WebkitSpeechRecognitionResult | null;
  [index: number]: WebkitSpeechRecognitionResult;
}

interface WebkitSpeechRecognitionResult {
  readonly length: number;
  item(index: number): WebkitSpeechRecognitionAlternative | null;
  [index: number]: WebkitSpeechRecognitionAlternative;
  readonly isFinal: boolean;
}

interface WebkitSpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface WebkitSpeechRecognitionErrorEvent {
  readonly error: string;
}

