"use client";

// ============================================
// COLONY ASSISTANT - Command Bar
// Premium ChatGPT-style input with voice support
// Now powered by LAM (Large Action Model)
// ============================================

import { useRef, useEffect, useCallback, useState, type KeyboardEvent } from "react";
import { Send, Command, MessageSquare, ChevronUp, Mic, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAssistantStore } from "@/lib/assistant/store";
import { useCRMContext } from "@/lib/context/CRMContext";
import { SuggestionChips } from "./SuggestionChips";
import { SlashCommandMenu } from "./SlashCommandMenu";
import { useVoiceInput } from "@/hooks/useVoiceInput";

export function CommandBar() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { getContext } = useCRMContext();
  const [showUndoHint, setShowUndoHint] = useState(false);

  const {
    input,
    setInput,
    isLoading,
    isSlashMenuOpen,
    closeSlashMenu,
    messages,
    openDrawer,
    isDrawerOpen,
    sendToLam,
    undoLastRun,
    canUndo,
    lastRunId,
  } = useAssistantStore();

  const pendingVoiceSubmit = useRef(false);

  const {
    isSupported: voiceSupported,
    isListening,
    isTranscribing,
    startListening,
    stopListening,
    clearTranscript,
  } = useVoiceInput({
    onResult: (text) => {
      setInput(text);
      clearTranscript();
      pendingVoiceSubmit.current = true;
    },
    onError: (msg) => {
      toast.error(msg);
    },
  });

  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (pendingVoiceSubmit.current && input.trim() && !isTranscribing) {
      pendingVoiceSubmit.current = false;
      handleSubmit();
    }
  });

  // Show undo hint after action completes
  useEffect(() => {
    if (canUndo && lastRunId) {
      setShowUndoHint(true);
      const timer = setTimeout(() => setShowUndoHint(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [canUndo, lastRunId]);

  // Auto-grow textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 144);
      textarea.style.height = `${newHeight}px`;
    }
  }, [input]);

  // Focus on Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        textareaRef.current?.focus();
      }
      // Cmd+Z for undo when assistant is focused
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && canUndo) {
        // Only if no text is selected and we're in the assistant context
        if (document.activeElement === textareaRef.current && !input) {
          e.preventDefault();
          undoLastRun();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [canUndo, undoLastRun, input]);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const context = getContext();
    await sendToLam(input.trim(), context);
  }, [input, isLoading, getContext, sendToLam]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    // Escape closes slash menu or stops listening
    if (e.key === "Escape") {
      if (isListening) {
        stopListening();
        clearTranscript();
      }
      closeSlashMenu();
    }
  };

  const handleChipClick = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  const handleSlashSelect = (command: string) => {
    setInput(command + " ");
    closeSlashMenu();
    textareaRef.current?.focus();
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] md:pl-52" suppressHydrationWarning>
      <div className="mx-auto max-w-[860px] px-4 pb-4" suppressHydrationWarning>
        {/* Undo hint - shows briefly after action */}
        {showUndoHint && canUndo && (
          <div className="flex items-center justify-center mb-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <button
              onClick={undoLastRun}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full",
                "bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400",
                "text-xs font-medium",
                "transition-colors duration-150"
              )}
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span>Undo last action</span>
            </button>
          </div>
        )}

        {/* Conversation indicator */}
        {hasMessages && !isDrawerOpen && (
          <button
            onClick={openDrawer}
            className={cn(
              "flex items-center gap-2 mx-auto mb-2 px-3 py-1.5 rounded-full",
              "bg-primary/10 hover:bg-primary/15 text-primary",
              "text-xs font-medium",
              "transition-colors duration-150"
            )}
          >
            <ChevronUp className="h-3.5 w-3.5" />
            <span>View conversation ({messages.length})</span>
          </button>
        )}

        {/* Suggestion Chips */}
        {!input && !hasMessages && !isListening && (
          <SuggestionChips onChipClick={handleChipClick} />
        )}

        {/* Recording / Transcribing indicator */}
        {(isListening || isTranscribing) && (
          <div className="flex items-center justify-center gap-2 mb-3 animate-in fade-in duration-200">
            {isTranscribing ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm font-medium text-muted-foreground">Transcribing...</span>
              </>
            ) : (
              <>
                <div className="relative">
                  <Mic className="h-5 w-5 text-red-500" />
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                </div>
                <span className="text-sm font-medium text-red-500">Listening...</span>
                <button
                  onClick={() => {
                    stopListening();
                    clearTranscript();
                    setInput("");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground ml-2"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        )}

        {/* Slash Command Menu */}
        {isSlashMenuOpen && (
          <SlashCommandMenu
            query={input.slice(1)}
            onSelect={handleSlashSelect}
            onClose={closeSlashMenu}
          />
        )}

        {/* Command Bar */}
        <div
          className={cn(
            "relative flex items-end gap-2 rounded-2xl",
            "bg-card/95 backdrop-blur-xl",
            "border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)]",
            "shadow-[0_-4px_24px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)]",
            "dark:shadow-[0_-4px_24px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.05)]",
            "p-2 pl-4",
            "transition-all duration-200",
            isListening && "ring-2 ring-red-500/50",
            isTranscribing && "ring-2 ring-primary/40"
          )}
        >
          {/* AI Indicator */}
          <div className="flex items-center gap-2 pb-2.5 shrink-0">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg",
                hasMessages ? "bg-primary text-primary-foreground" : "bg-primary/10"
              )}
            >
              <MessageSquare className={cn("h-4 w-4", hasMessages ? "" : "text-primary")} />
            </div>
          </div>

          {/* Input */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isTranscribing
                ? "Transcribing..."
                : isListening
                ? "Listening..."
                : hasMessages
                ? "Continue the conversation..."
                : "Ask anything or type / for commands..."
            }
            disabled={isLoading}
            rows={1}
            className={cn(
              "flex-1 resize-none bg-transparent py-2.5 text-sm",
              "placeholder:text-muted-foreground/60",
              "focus:outline-none",
              "disabled:opacity-50",
              "min-h-[40px] max-h-[144px]"
            )}
            aria-label="Assistant command input"
          />

          {/* Voice Input Button */}
          {voiceSupported && (
            <button
              type="button"
              onClick={handleVoiceToggle}
              disabled={isLoading || isTranscribing}
              className={cn(
                "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                "transition-all duration-200",
                isListening
                  ? "bg-red-500 text-white hover:bg-red-600 scale-110"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                (isLoading || isTranscribing) && "opacity-50 cursor-not-allowed"
              )}
              aria-label={isListening ? "Stop voice input" : "Start voice input"}
              title={isListening ? "Stop listening" : "Voice input"}
            >
              {isListening && (
                <>
                  <span className="absolute inset-0 rounded-xl bg-red-500 animate-ping opacity-30" />
                  <span className="absolute inset-0 rounded-xl bg-red-500/20 animate-pulse" />
                </>
              )}
              <Mic className={cn("h-4 w-4 relative z-10", isListening && "animate-pulse")} />
            </button>
          )}

          {/* Send Button */}
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              "transition-all duration-150",
              input.trim() && !isLoading
                ? "bg-primary text-primary-foreground hover:-translate-y-0.5 shadow-sm"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
            aria-label="Send message"
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Keyboard Hints */}
        {!hasMessages && !isListening && (
          <div className="flex items-center justify-center gap-4 mt-2 text-[11px] text-muted-foreground/60">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">
                <Command className="inline h-2.5 w-2.5" />K
              </kbd>
              <span>to focus</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">/</kbd>
              <span>for commands</span>
            </span>
            {voiceSupported && (
              <span className="flex items-center gap-1">
                <Mic className="h-3 w-3" />
                <span>for voice</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">↵</kbd>
              <span>to send</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
