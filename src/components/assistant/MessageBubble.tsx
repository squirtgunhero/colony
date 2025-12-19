"use client";

// ============================================
// COLONY ASSISTANT - Message Bubble
// Individual message display with actions
// ============================================

import { useState, useEffect } from "react";
import { User, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssistantMessage, PendingAction } from "@/lib/assistant/types";
import { ActionPreviewCard } from "./ActionPreviewCard";
import { isMutationAction } from "@/lib/assistant/actions";
import { useAssistantStore } from "@/lib/assistant/store";

interface MessageBubbleProps {
  message: AssistantMessage;
  pendingActions: PendingAction[];
  onApplyAction: (id: string) => void;
  onCancelAction: (id: string) => void;
}

export function MessageBubble({
  message,
  pendingActions,
  onApplyAction,
  onCancelAction,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const { setInput, sendMessage } = useAssistantStore();
  const [formattedTime, setFormattedTime] = useState<string>("");

  // Format time on client only to avoid hydration mismatch
  useEffect(() => {
    setFormattedTime(
      message.timestamp.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, [message.timestamp]);

  const handleFollowupClick = (followup: string) => {
    setInput(followup);
    sendMessage(followup);
  };

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-foreground text-background"
            : "bg-primary/10 text-primary"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <MessageSquare className="h-4 w-4" />
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          "flex flex-col gap-2 max-w-[80%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* Message Text */}
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm",
            isUser
              ? "bg-foreground text-background rounded-tr-md"
              : "bg-muted text-foreground rounded-tl-md"
          )}
        >
          {/* Render markdown-like content */}
          <div className="whitespace-pre-wrap">
            {message.content.split("**").map((part, i) =>
              i % 2 === 1 ? (
                <strong key={i}>{part}</strong>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </div>
        </div>

        {/* Action Preview Cards */}
        {message.actions && message.actions.length > 0 && (
          <div className="w-full space-y-2">
            {message.actions.map((action, index) => {
              // Find the pending action for this action
              const pendingAction = pendingActions.find(
                (pa) => JSON.stringify(pa.action) === JSON.stringify(action)
              );

              // Only show preview card for mutation actions
              if (!isMutationAction(action)) return null;

              return (
                <ActionPreviewCard
                  key={index}
                  action={action}
                  status={pendingAction?.status || "pending"}
                  onApply={() => pendingAction && onApplyAction(pendingAction.id)}
                  onCancel={() => pendingAction && onCancelAction(pendingAction.id)}
                />
              );
            })}
          </div>
        )}

        {/* Follow-up Suggestions */}
        {message.followups && message.followups.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {message.followups.map((followup, index) => (
              <button
                key={index}
                onClick={() => handleFollowupClick(followup)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full",
                  "bg-muted/50 text-muted-foreground",
                  "hover:bg-muted hover:text-foreground",
                  "border border-[rgba(0,0,0,0.04)] dark:border-[rgba(255,255,255,0.04)]",
                  "transition-colors duration-150"
                )}
              >
                {followup}
              </button>
            ))}
          </div>
        )}

        {/* Timestamp - client-only to avoid hydration mismatch */}
        <span className="text-[10px] text-muted-foreground/60">
          {formattedTime}
        </span>
      </div>
    </div>
  );
}

