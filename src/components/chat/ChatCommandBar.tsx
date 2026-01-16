"use client";

// ============================================
// COLONY - Chat Mode Command Bar
// Primary interaction surface for Chat Mode
// Supports plain text, slash commands, autocomplete
// ============================================

import { useRef, useEffect, useCallback, useState, type KeyboardEvent } from "react";
import { Send, Command, Mic, Undo2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssistantStore } from "@/lib/assistant/store";
import { useCRMContext } from "@/lib/context/CRMContext";
import { useModeStore } from "@/lib/mode";
import { ChatSlashCommandMenu } from "./ChatSlashCommandMenu";
import { useVoiceInput } from "@/hooks/useVoiceInput";

export function ChatCommandBar() {
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
    sendToLam,
    undoLastRun,
    canUndo,
    lastRunId,
  } = useAssistantStore();

  const { openDrawer } = useModeStore();

  // Voice input hook
  const {
    isSupported: voiceSupported,
    isListening,
    transcript,
    startListening,
    stopListening,
    clearTranscript,
  } = useVoiceInput({
    language: "en-US",
    continuous: false,
    onResult: (text) => {
      setInput(text);
      clearTranscript();
      textareaRef.current?.focus();
    },
    onInterimResult: (text) => {
      setInput(text);
    },
  });

  const hasMessages = messages.length > 0;

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
        if (document.activeElement === textareaRef.current && !input) {
          e.preventDefault();
          undoLastRun();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [canUndo, undoLastRun, input]);

  // Handle special commands that trigger drawer
  const handleDrawerCommands = useCallback((message: string): boolean => {
    const lowerMessage = message.toLowerCase().trim();
    
    if (lowerMessage.startsWith("/show-pipeline") || lowerMessage.includes("show pipeline") || lowerMessage.includes("show my pipeline")) {
      openDrawer("pipeline");
      return true;
    }
    
    // Parse /show-contact <name or id>
    const contactMatch = lowerMessage.match(/\/show-contact\s+(.+)/);
    if (contactMatch) {
      openDrawer("contact", contactMatch[1], contactMatch[1]);
      return true;
    }
    
    // Parse /show-deal <name or id>
    const dealMatch = lowerMessage.match(/\/show-deal\s+(.+)/);
    if (dealMatch) {
      openDrawer("deal", dealMatch[1], dealMatch[1]);
      return true;
    }
    
    return false;
  }, [openDrawer]);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const trimmedInput = input.trim();
    
    // Check for drawer commands first
    if (handleDrawerCommands(trimmedInput)) {
      setInput("");
      closeSlashMenu();
      return;
    }

    const context = getContext();
    await sendToLam(trimmedInput, context);
  }, [input, isLoading, getContext, sendToLam, handleDrawerCommands, setInput, closeSlashMenu]);

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
    <div className="fixed bottom-0 left-0 right-0 z-[60] md:pl-14" suppressHydrationWarning>
      <div className="mx-auto max-w-2xl px-4 pb-6" suppressHydrationWarning>
        {/* Undo hint - shows briefly after action */}
        {showUndoHint && canUndo && (
          <div className="flex items-center justify-center mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
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

        {/* Listening indicator */}
        {isListening && (
          <div className="flex items-center justify-center gap-2 mb-3 animate-in fade-in duration-200">
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
          </div>
        )}

        {/* Slash Command Menu */}
        <div className="relative">
          {isSlashMenuOpen && (
            <ChatSlashCommandMenu
              query={input.slice(1)}
              onSelect={handleSlashSelect}
              onClose={closeSlashMenu}
            />
          )}

          {/* Command Bar */}
          <div
            className={cn(
              "relative flex items-end gap-2 rounded-2xl",
              "bg-card/98 backdrop-blur-xl",
              "border border-border/50",
              "shadow-[0_-8px_32px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)]",
              "dark:shadow-[0_-8px_32px_rgba(0,0,0,0.25),0_0_0_1px_rgba(255,255,255,0.04)]",
              "p-2 pl-4",
              "transition-all duration-200",
              isListening && "ring-2 ring-red-500/50"
            )}
          >
            {/* AI Indicator */}
            <div className="flex items-center gap-2 pb-2.5 shrink-0">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl",
                  "bg-gradient-to-br from-primary/20 to-primary/5",
                  "border border-primary/10"
                )}
              >
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
            </div>

            {/* Input */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isListening
                  ? "Listening..."
                  : "Ask or type / for commands..."
              }
              disabled={isLoading}
              rows={1}
              className={cn(
                "flex-1 resize-none bg-transparent py-2.5 text-sm",
                "placeholder:text-muted-foreground/50",
                "focus:outline-none",
                "disabled:opacity-50",
                "min-h-[40px] max-h-[144px]"
              )}
              aria-label="Chat command input"
            />

            {/* Voice Input Button */}
            {voiceSupported && (
              <button
                type="button"
                onClick={handleVoiceToggle}
                disabled={isLoading}
                className={cn(
                  "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  "transition-all duration-200",
                  isListening
                    ? "bg-red-500 text-white hover:bg-red-600 scale-110"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                  isLoading && "opacity-50 cursor-not-allowed"
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
                  : "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
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
        </div>

        {/* Keyboard Hints */}
        {!hasMessages && !isListening && (
          <div className="flex items-center justify-center gap-4 mt-3 text-[11px] text-muted-foreground/40">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted/50 text-[10px]">
                <Command className="inline h-2.5 w-2.5" />K
              </kbd>
              <span>focus</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted/50 text-[10px]">/</kbd>
              <span>commands</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted/50 text-[10px]">↵</kbd>
              <span>send</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
