"use client";

// ============================================
// COLONY - Chat Canvas
// Clean, conversation-first interface
// No dashboard widgets, just messages + command bar
// ============================================

import { useEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssistantStore } from "@/lib/assistant/store";
import { MessageBubble } from "@/components/assistant/MessageBubble";
import { ChatSuggestionChips } from "./ChatSuggestionChips";
import { useModeStore } from "@/lib/mode";

export function ChatCanvas() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    pendingActions,
    applyAction,
    cancelAction,
  } = useAssistantStore();

  const { activeChips, clearChips } = useModeStore();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Clear chips after user sends a message
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "user") {
        clearChips();
      }
    }
  }, [messages, clearChips]);

  const hasMessages = messages.length > 0;

  return (
    <div 
      ref={scrollContainerRef}
      className="flex-1 flex flex-col overflow-y-auto pb-32"
    >
      <div className="mx-auto w-full max-w-2xl px-4 py-8 flex-1 flex flex-col">
        {/* Empty State */}
        {!hasMessages && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/5 border border-primary/10 mb-4">
                <MessageSquare className="h-8 w-8 text-primary/60" />
              </div>
              <h1 className="text-2xl font-semibold text-foreground mb-2">
                Colony Assistant
              </h1>
              <p className="text-muted-foreground max-w-md">
                Your AI-powered CRM companion. Ask questions, create contacts, 
                manage deals, and more using natural language.
              </p>
            </div>

            {/* Quick start hints */}
            <div className="flex flex-wrap justify-center gap-2 mt-4 text-xs text-muted-foreground/60">
              <span>Try:</span>
              <span className="px-2 py-1 rounded-md bg-muted/50">&quot;Create a new contact&quot;</span>
              <span className="px-2 py-1 rounded-md bg-muted/50">&quot;Show my pipeline&quot;</span>
              <span className="px-2 py-1 rounded-md bg-muted/50">&quot;Find hot leads&quot;</span>
            </div>
          </div>
        )}

        {/* Messages */}
        {hasMessages && (
          <div className="space-y-6 mt-auto">
            {messages.map((message, index) => (
              <div key={message.id}>
                <MessageBubble
                  message={message}
                  pendingActions={pendingActions.filter((pa) =>
                    message.actions?.some(
                      (a) => JSON.stringify(a) === JSON.stringify(pa.action)
                    )
                  )}
                  onApplyAction={applyAction}
                  onCancelAction={cancelAction}
                />
                
                {/* Show suggestion chips after last assistant message */}
                {message.role === "assistant" && 
                 index === messages.length - 1 && 
                 activeChips.length > 0 && (
                  <ChatSuggestionChips />
                )}
              </div>
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
        )}
      </div>
    </div>
  );
}
