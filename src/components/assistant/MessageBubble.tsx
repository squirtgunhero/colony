"use client";

// ============================================
// COLONY ASSISTANT - Message Bubble
// Individual message display with LAM actions
// ============================================

import { useState, useEffect } from "react";
import { 
  User, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Undo2,
  ChevronDown,
  ChevronUp,
  Shield,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssistantMessage, PendingAction, LamAction } from "@/lib/assistant/types";
import { getActionTypeLabel, getRiskTierColor } from "@/lib/assistant/types";
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
  const { setInput, sendToLam, undoLastRun, approveRun, canUndo, lastRunId } = useAssistantStore();
  const [formattedTime, setFormattedTime] = useState<string>("");
  const [showDetails, setShowDetails] = useState(false);

  // Check if this message has LAM response
  const lamResponse = message.lamResponse;
  const hasExecution = lamResponse?.execution_result;
  const isExecuted = hasExecution?.status === "completed";
  const hasFailed = hasExecution?.actions_failed && hasExecution.actions_failed > 0;
  const needsApproval = lamResponse?.response?.requires_approval;
  const messageCanUndo = message.canUndo && message.runId === lastRunId && canUndo;

  // Format time on client only
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
    sendToLam(followup);
  };

  const handleApprove = () => {
    if (message.runId) {
      approveRun(message.runId);
    }
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
          {/* Render content with basic markdown */}
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

        {/* LAM Execution Status */}
        {lamResponse && hasExecution && (
          <div className="w-full">
            {/* Status Badge */}
            <div
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                isExecuted && !hasFailed && "bg-green-500/10 text-green-600 dark:text-green-400",
                hasFailed && "bg-red-500/10 text-red-600 dark:text-red-400",
                needsApproval && "bg-orange-500/10 text-orange-600 dark:text-orange-400"
              )}
            >
              {isExecuted && !hasFailed && (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Executed</span>
                </>
              )}
              {hasFailed && (
                <>
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Partially Failed</span>
                </>
              )}
              {needsApproval && (
                <>
                  <Clock className="h-3.5 w-3.5" />
                  <span>Awaiting Approval</span>
                </>
              )}
            </div>

            {/* Action Details Expandable */}
            {lamResponse.plan?.actions && lamResponse.plan.actions.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showDetails ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  <span>{lamResponse.plan.actions.length} action(s)</span>
                </button>

                {showDetails && (
                  <div className="mt-2 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    {lamResponse.plan.actions.map((action: LamAction, index: number) => (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg",
                          "bg-muted/50 text-xs"
                        )}
                      >
                        <Zap className={cn("h-3.5 w-3.5", getRiskTierColor(action.risk_tier))} />
                        <span className="font-medium">{getActionTypeLabel(action.type)}</span>
                        {action.requires_approval && (
                          <span className="flex items-center gap-1 text-orange-500">
                            <Shield className="h-3 w-3" />
                            Approval
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Approve Button for Tier 2 */}
            {needsApproval && message.runId && (
              <button
                onClick={handleApprove}
                className={cn(
                  "mt-2 flex items-center gap-2 px-4 py-2 rounded-lg",
                  "bg-primary text-primary-foreground text-sm font-medium",
                  "hover:bg-primary/90 transition-colors"
                )}
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve & Execute
              </button>
            )}

            {/* Undo Button */}
            {messageCanUndo && (
              <button
                onClick={undoLastRun}
                className={cn(
                  "mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg",
                  "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                  "hover:bg-amber-500/20 text-sm font-medium",
                  "transition-colors"
                )}
              >
                <Undo2 className="h-3.5 w-3.5" />
                Undo
              </button>
            )}
          </div>
        )}

        {/* Legacy Action Preview Cards */}
        {message.actions && message.actions.length > 0 && !lamResponse && (
          <div className="w-full space-y-2">
            {message.actions.map((action, index) => {
              const pendingAction = pendingActions.find(
                (pa) => JSON.stringify(pa.action) === JSON.stringify(action)
              );

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

        {/* Timestamp */}
        <span className="text-[10px] text-muted-foreground/60">
          {formattedTime}
        </span>
      </div>
    </div>
  );
}
