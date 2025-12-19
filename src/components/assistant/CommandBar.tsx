"use client";

// ============================================
// COLONY ASSISTANT - Command Bar
// Premium ChatGPT-style input fixed to bottom
// ============================================

import { useRef, useEffect, useCallback, type KeyboardEvent } from "react";
import { Send, Command, MessageSquare, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssistantStore } from "@/lib/assistant/store";
import { useCRMContext } from "@/lib/context/CRMContext";
import { SuggestionChips } from "./SuggestionChips";
import { SlashCommandMenu } from "./SlashCommandMenu";

export function CommandBar() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { getContext } = useCRMContext();

  const {
    input,
    setInput,
    isLoading,
    setLoading,
    isSlashMenuOpen,
    closeSlashMenu,
    addMessage,
    messages,
    openDrawer,
    isDrawerOpen,
  } = useAssistantStore();

  const hasMessages = messages.length > 0;

  // Auto-grow textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 144); // Max 6 lines (~24px each)
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
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    closeSlashMenu();

    // Add user message
    const userMsgId = `user-${Date.now()}`;
    addMessage({
      id: userMsgId,
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    });

    setLoading(true);

    try {
      const context = getContext();
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, context }),
      });

      if (!res.ok) throw new Error("Failed to get response");

      const data = await res.json();

      // Add assistant message
      addMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        actions: data.actions,
        followups: data.followups,
        timestamp: new Date(),
      });
    } catch (error) {
      addMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      });
    } finally {
      setLoading(false);
    }
  }, [input, isLoading, setInput, closeSlashMenu, addMessage, setLoading, getContext]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    // Escape closes slash menu
    if (e.key === "Escape") {
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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] md:pl-14" suppressHydrationWarning>
      <div className="mx-auto max-w-[860px] px-4 pb-4" suppressHydrationWarning>
        {/* Conversation indicator - shows when there are messages but drawer is closed */}
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

        {/* Suggestion Chips - Show when input empty and no messages */}
        {!input && !hasMessages && (
          <SuggestionChips onChipClick={handleChipClick} />
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
            "transition-all duration-200"
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
              hasMessages
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

        {/* Keyboard Hint - only show when no messages */}
        {!hasMessages && (
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
