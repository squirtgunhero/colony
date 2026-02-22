"use client";

import { useRef, useEffect, useCallback, useState, type KeyboardEvent } from "react";
import { Send, Mic, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useAssistantStore } from "@/lib/assistant/store";
import { useCRMContext } from "@/lib/context/CRMContext";
import { useModeStore } from "@/lib/mode";
import { useChatTheme } from "@/lib/chat-theme-context";
import { ChatSlashCommandMenu } from "./ChatSlashCommandMenu";
import { useVoiceInput } from "@/hooks/useVoiceInput";

export function ChatCommandBar() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { getContext } = useCRMContext();
  const [showUndoHint, setShowUndoHint] = useState(false);
  const { theme } = useChatTheme();

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

  useEffect(() => {
    if (canUndo && lastRunId) {
      setShowUndoHint(true);
      const timer = setTimeout(() => setShowUndoHint(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [canUndo, lastRunId]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 144);
      textarea.style.height = `${newHeight}px`;
    }
  }, [input]);

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        textareaRef.current?.focus();
      }
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

  const handleDrawerCommands = useCallback(
    (message: string): boolean => {
      const lowerMessage = message.toLowerCase().trim();

      if (
        lowerMessage.startsWith("/show-pipeline") ||
        lowerMessage.includes("show pipeline") ||
        lowerMessage.includes("show my pipeline")
      ) {
        openDrawer("pipeline");
        return true;
      }

      const contactMatch = lowerMessage.match(/\/show-contact\s+(.+)/);
      if (contactMatch) {
        openDrawer("contact", contactMatch[1], contactMatch[1]);
        return true;
      }

      const dealMatch = lowerMessage.match(/\/show-deal\s+(.+)/);
      if (dealMatch) {
        openDrawer("deal", dealMatch[1], dealMatch[1]);
        return true;
      }

      return false;
    },
    [openDrawer]
  );

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const trimmedInput = input.trim();

    if (handleDrawerCommands(trimmedInput)) {
      setInput("");
      closeSlashMenu();
      return;
    }

    const context = getContext();
    await sendToLam(trimmedInput, context);
  }, [input, isLoading, getContext, sendToLam, handleDrawerCommands, setInput, closeSlashMenu]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
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

  const showSend = input.trim().length > 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] md:pl-14" suppressHydrationWarning>
      <div className="mx-auto max-w-2xl px-4 pb-6" suppressHydrationWarning>
        {/* Undo hint */}
        {showUndoHint && canUndo && (
          <div className="flex items-center justify-center mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <button
              onClick={undoLastRun}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-150"
              style={{
                backgroundColor: theme.accentGlow,
                color: theme.accent,
              }}
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span>Undo last action</span>
            </button>
          </div>
        )}

        {/* Recording / Transcribing indicator */}
        {(isListening || isTranscribing) && (
          <div className="flex items-center justify-center gap-2 mb-3 animate-in fade-in duration-200">
            {isTranscribing ? (
              <>
                <div
                  className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
                  style={{ borderColor: theme.accent, borderTopColor: "transparent" }}
                />
                <span
                  className="text-sm font-medium"
                  style={{ color: theme.textMuted, fontFamily: "var(--font-dm-sans), sans-serif" }}
                >
                  Transcribing...
                </span>
              </>
            ) : (
              <>
                <div className="relative">
                  <Mic className="h-5 w-5" style={{ color: theme.accent }} />
                  <span
                    className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full animate-pulse"
                    style={{ backgroundColor: theme.accent }}
                  />
                </div>
                <span
                  className="text-sm font-medium"
                  style={{ color: theme.accent, fontFamily: "var(--font-dm-sans), sans-serif" }}
                >
                  Listening...
                </span>
                <button
                  onClick={() => {
                    stopListening();
                    clearTranscript();
                    setInput("");
                  }}
                  className="text-xs ml-2 transition-colors"
                  style={{ color: theme.textMuted }}
                >
                  Cancel
                </button>
              </>
            )}
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

          {/* Input bar */}
          <div
            className="relative flex items-end gap-2 p-2 pl-4 transition-all duration-300"
            style={{
              borderRadius: "28px",
              backgroundColor: theme.surface,
              border: `1px solid ${isListening ? theme.accentSoft : theme.accentGlow}`,
              boxShadow: isListening
                ? `0 0 20px ${theme.accentGlow}, 0 0 40px ${theme.accentGlow}`
                : "none",
            }}
          >
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
                    : "Talk to Colony..."
              }
              disabled={isLoading}
              rows={1}
              className="flex-1 resize-none bg-transparent py-2.5 text-[15px] placeholder:opacity-25 focus:outline-none disabled:opacity-50 min-h-[40px] max-h-[144px]"
              style={{
                fontFamily: "var(--font-dm-sans), sans-serif",
                color: theme.text,
                caretColor: theme.accent,
              }}
              aria-label="Chat command input"
            />

            {/* Mic Button */}
            {voiceSupported && (
              <button
                type="button"
                onClick={handleVoiceToggle}
                disabled={isLoading || isTranscribing}
                className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200"
                style={{
                  backgroundColor: isListening ? theme.accentSoft : "transparent",
                  color: isListening ? theme.accent : theme.textMuted,
                  opacity: isLoading || isTranscribing ? 0.5 : 1,
                }}
                aria-label={isListening ? "Stop voice input" : "Start voice input"}
              >
                {isListening && (
                  <span
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{ backgroundColor: theme.accent, opacity: 0.15 }}
                  />
                )}
                <Mic className="h-4 w-4 relative z-10" />
              </button>
            )}

            {/* Send Button — only visible when there's text */}
            {showSend && (
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200 animate-in fade-in zoom-in-75 duration-150"
                style={{
                  backgroundColor: theme.accentSoft,
                  color: theme.accent,
                }}
                aria-label="Send message"
              >
                {isLoading ? (
                  <div
                    className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
                    style={{ borderColor: theme.accent, borderTopColor: "transparent" }}
                  />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Hints */}
        {!hasMessages && !isListening && (
          <div
            className="flex items-center justify-center gap-4 mt-3 text-[11px]"
            style={{
              color: theme.textMuted,
              opacity: 0.5,
              fontFamily: "var(--font-dm-sans), sans-serif",
            }}
          >
            <span>press enter to send</span>
            <span>·</span>
            <span>click mic for voice</span>
          </div>
        )}
      </div>
    </div>
  );
}
