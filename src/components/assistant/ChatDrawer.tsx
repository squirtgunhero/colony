"use client";

// ============================================
// COLONY ASSISTANT - Full Page Chat Interface
// Takes over the main content area when active
// ============================================

import { useEffect, useRef } from "react";
import { X, Trash2, MessageSquare, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssistantStore } from "@/lib/assistant/store";
import { MessageBubble } from "./MessageBubble";
import { Button } from "@/components/ui/button";

export function ChatDrawer() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    isDrawerOpen,
    closeDrawer,
    messages,
    clearMessages,
    pendingActions,
    applyAction,
    cancelAction,
    isLoading,
  } = useAssistantStore();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDrawerOpen) {
        closeDrawer();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen, closeDrawer]);

  // Don't render if not open or no messages
  if (!isDrawerOpen || messages.length === 0) {
    return null;
  }

  return (
    <>
      {/* Backdrop overlay that covers everything */}
      <div
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:pl-52"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Chat Panel - slides up from bottom */}
      <div
        role="dialog"
        aria-label="Colony Assistant Chat"
        aria-modal="true"
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 md:pl-52",
          "flex flex-col",
          "bg-background",
          "border-t border-border",
          "shadow-[0_-8px_32px_rgba(0,0,0,0.12)]",
          "dark:shadow-[0_-8px_32px_rgba(0,0,0,0.4)]",
          "animate-in slide-in-from-bottom duration-300 ease-out",
          // Take up most of the screen height, leaving room for visual context
          "h-[calc(100vh-4rem)] max-h-[800px]",
          "rounded-t-2xl"
        )}
        suppressHydrationWarning
      >
        {/* Header */}
        <header className="flex items-center justify-between h-14 px-4 md:px-6 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Colony Assistant</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {messages.length} message{messages.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => {
                  clearMessages();
                  closeDrawer();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={closeDrawer}
              aria-label="Minimize chat"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                clearMessages();
                closeDrawer();
              }}
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Messages Area */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overscroll-contain"
        >
          <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
            {/* Welcome Banner (shown with first message) */}
            {messages.length <= 2 && (
              <div className="text-center pb-6 mb-6 border-b border-border/50">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 mb-3">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-lg font-semibold mb-1">Colony Assistant</h2>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  I can help you manage leads, create tasks, and navigate your CRM.
                </p>
              </div>
            )}

            {/* Message List */}
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                pendingActions={pendingActions.filter((pa) =>
                  message.actions?.some(
                    (a) => JSON.stringify(a) === JSON.stringify(pa.action)
                  )
                )}
                onApplyAction={applyAction}
                onCancelAction={cancelAction}
              />
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md bg-muted px-4 py-3">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]" />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]" />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-1" />
          </div>
        </div>

        {/* Bottom spacer for command bar */}
        <div className="h-28 shrink-0 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      </div>
    </>
  );
}
