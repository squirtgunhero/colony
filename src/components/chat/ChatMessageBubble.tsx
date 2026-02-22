"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Undo2,
  ChevronDown,
  ChevronUp,
  Shield,
  Zap,
} from "lucide-react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import type { AssistantMessage, PendingAction, LamAction } from "@/lib/assistant/types";
import { getActionTypeLabel, getRiskTierColor } from "@/lib/assistant/types";
import { ActionPreviewCard } from "@/components/assistant/ActionPreviewCard";
import { isMutationAction } from "@/lib/assistant/actions";
import { useAssistantStore } from "@/lib/assistant/store";

interface ChatMessageBubbleProps {
  message: AssistantMessage;
  pendingActions: PendingAction[];
  onApplyAction: (id: string) => void;
  onCancelAction: (id: string) => void;
}

export function ChatMessageBubble({
  message,
  pendingActions,
  onApplyAction,
  onCancelAction,
}: ChatMessageBubbleProps) {
  const isUser = message.role === "user";
  const { theme } = useColonyTheme();
  const { setInput, sendToLam, undoLastRun, approveRun, canUndo, lastRunId } =
    useAssistantStore();
  const [formattedTime, setFormattedTime] = useState<string>("");
  const [showDetails, setShowDetails] = useState(false);

  const lamResponse = message.lamResponse;
  const hasExecution = lamResponse?.execution_result;
  const isExecuted = hasExecution?.status === "completed";
  const hasFailed =
    hasExecution?.actions_failed && hasExecution.actions_failed > 0;
  const needsApproval = lamResponse?.response?.requires_approval;
  const messageCanUndo =
    message.canUndo && message.runId === lastRunId && canUndo;

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

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="flex flex-col items-end gap-1 max-w-[80%]">
          <div
            className="px-5 py-3 text-[15px]"
            style={{
              fontFamily: "var(--font-dm-sans), sans-serif",
              fontWeight: 400,
              color: theme.textSoft,
              backgroundColor: theme.userBubble,
              border: `1px solid ${theme.accentSoft}`,
              borderRadius: "20px 20px 4px 20px",
              lineHeight: 1.5,
            }}
          >
            <span className="whitespace-pre-wrap">{message.content}</span>
          </div>
          <span
            className="text-[10px] pr-1"
            style={{ color: theme.textMuted, opacity: 0.6 }}
          >
            {formattedTime}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-w-[90%]">
      {/* Colony's message — no bubble, floating text */}
      <div
        className="whitespace-pre-wrap text-[17px]"
        style={{
          fontFamily: "var(--font-spectral), Georgia, serif",
          fontWeight: 300,
          color: theme.text,
          lineHeight: 1.65,
        }}
      >
        {message.content.split("**").map((part, i) =>
          i % 2 === 1 ? (
            <strong key={i} style={{ fontWeight: 400 }}>
              {part}
            </strong>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </div>

      {/* LAM Execution Status */}
      {lamResponse && hasExecution && (
        <div>
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: isExecuted && !hasFailed
                ? "rgba(74, 222, 128, 0.1)"
                : hasFailed
                  ? "rgba(239, 68, 68, 0.1)"
                  : "rgba(251, 146, 60, 0.1)",
              color: isExecuted && !hasFailed
                ? "#4ade80"
                : hasFailed
                  ? "#ef4444"
                  : "#fb923c",
            }}
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

          {lamResponse.plan?.actions && lamResponse.plan.actions.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1 text-xs transition-colors"
                style={{ color: theme.textMuted }}
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
                  {lamResponse.plan.actions.map(
                    (action: LamAction, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                        style={{ backgroundColor: theme.surface }}
                      >
                        <Zap
                          className="h-3.5 w-3.5"
                          style={{ color: getRiskTierColor(action.risk_tier) }}
                        />
                        <span className="font-medium" style={{ color: theme.textSoft }}>
                          {getActionTypeLabel(action.type)}
                        </span>
                        {action.requires_approval && (
                          <span className="flex items-center gap-1 text-orange-500">
                            <Shield className="h-3 w-3" />
                            Approval
                          </span>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {needsApproval && message.runId && (
            <button
              onClick={handleApprove}
              className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: theme.accent,
                color: theme.bg,
              }}
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve & Execute
            </button>
          )}

          {messageCanUndo && (
            <button
              onClick={undoLastRun}
              className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: theme.accentGlow,
                color: theme.accent,
              }}
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
                onCancel={() =>
                  pendingAction && onCancelAction(pendingAction.id)
                }
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
              className="text-xs px-2.5 py-1 rounded-full transition-colors duration-150"
              style={{
                color: theme.textMuted,
                backgroundColor: theme.surface,
                border: `1px solid ${theme.accentGlow}`,
              }}
            >
              {followup}
            </button>
          ))}
        </div>
      )}

      {/* Timestamp */}
      <span
        className="text-[10px]"
        style={{ color: theme.textMuted, opacity: 0.6 }}
      >
        {formattedTime}
      </span>
    </div>
  );
}
