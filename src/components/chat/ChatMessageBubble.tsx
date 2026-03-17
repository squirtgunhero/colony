"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  Undo2,
} from "lucide-react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import type { AssistantMessage, PendingAction, WelcomeChip } from "@/lib/assistant/types";
import { ActionPreviewCard } from "@/components/assistant/ActionPreviewCard";
import { isMutationAction } from "@/lib/assistant/actions";
import { useAssistantStore } from "@/lib/assistant/store";
import { ActionCard } from "./ActionCard";
import { withAlpha } from "@/lib/themes";

interface ChatMessageBubbleProps {
  message: AssistantMessage;
  pendingActions: PendingAction[];
  onApplyAction: (id: string) => void;
  onCancelAction: (id: string) => void;
}

/**
 * Render message content with support for **bold**, ![alt](url) images
 */
function renderMessageContent(content: string) {
  // First, extract markdown images ![alt](url)
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const parts: Array<{ type: "text"; value: string } | { type: "image"; alt: string; url: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = imageRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: "image", alt: match[1], url: match[2] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) });
  }

  return parts.map((part, idx) => {
    if (part.type === "image") {
      return (
        <span key={idx} className="block my-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={part.url}
            alt={part.alt}
            className="rounded-xl max-w-full"
            style={{ maxHeight: 400 }}
          />
        </span>
      );
    }
    // Render text with **bold** support
    return part.value.split("**").map((segment, i) =>
      i % 2 === 1 ? (
        <strong key={`${idx}-${i}`} style={{ fontWeight: 400 }}>
          {segment}
        </strong>
      ) : (
        <span key={`${idx}-${i}`}>{segment}</span>
      )
    );
  });
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
  const [showUndo, setShowUndo] = useState(true);

  const lamResponse = message.lamResponse;
  const hasExecution = lamResponse?.execution_result;
  const isExecuted = hasExecution?.status === "completed";
  const hasFailed =
    !!(hasExecution?.actions_failed && hasExecution.actions_failed > 0);
  const needsApproval = lamResponse?.response?.requires_approval;
  const messageCanUndo =
    message.canUndo && message.runId === lastRunId && canUndo;

  const actionCards = message.actionCards || [];
  const hasActionCards = actionCards.length > 0;

  useEffect(() => {
    setFormattedTime(
      message.timestamp.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, [message.timestamp]);

  // Fade out undo after 30 seconds
  useEffect(() => {
    if (messageCanUndo) {
      setShowUndo(true);
      const timer = setTimeout(() => setShowUndo(false), 30000);
      return () => clearTimeout(timer);
    }
  }, [messageCanUndo]);

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
        {renderMessageContent(message.content)}
        {/* Inline success indicator when no action cards and execution succeeded */}
        {lamResponse && hasExecution && !hasActionCards && isExecuted && !hasFailed && !needsApproval && (
          <CheckCircle2
            className="inline-block h-4 w-4 ml-1.5 -mt-0.5"
            style={{ color: withAlpha(theme.accent, 0.6) }}
          />
        )}
      </div>

      {/* Welcome Chips */}
      {message.chips && message.chips.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {message.chips.map((chip: WelcomeChip) => (
            <button
              key={chip.id}
              onClick={() => {
                setInput(chip.prompt);
                sendToLam(chip.prompt);
              }}
              className="text-sm px-3.5 py-1.5 rounded-full transition-all duration-150 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                color: theme.accent,
                backgroundColor: theme.accentGlow,
                border: `1px solid ${theme.accentSoft}`,
                fontFamily: "var(--font-dm-sans), sans-serif",
                fontWeight: 400,
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Action Cards */}
      {hasActionCards && (
        <div>
          {actionCards.map((card, index) => (
            <ActionCard key={index} card={card} />
          ))}
        </div>
      )}

      {/* Error message — when no action cards and execution failed */}
      {lamResponse && hasExecution && !hasActionCards && hasFailed && (
        <div
          className="text-[13px]"
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            backgroundColor: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.15)",
            color: "#EF4444",
          }}
        >
          {hasExecution.user_summary || "Something went wrong. Please try again."}
        </div>
      )}

      {/* Approval button */}
      {needsApproval && message.runId && (
        <button
          onClick={handleApprove}
          className="mt-1 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          style={{
            backgroundColor: theme.accent,
            color: theme.bg,
          }}
        >
          <CheckCircle2 className="h-4 w-4" />
          Approve & Execute
        </button>
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

      {/* Smart Chips for follow-up questions about ads */}
      {lamResponse?.response?.follow_up_question && (() => {
        const fq = lamResponse.response.follow_up_question.toLowerCase();
        const isBudget = fq.includes("budget") || fq.includes("daily budget") || fq.includes("spend");
        const isLeadType = fq.includes("seller") || fq.includes("buyer") || fq.includes("type of lead");
        const isAdCopy = fq.includes("headline") || fq.includes("ad copy") || fq.includes("copy") || fq.includes("text should") || fq.includes("what should the ad say");
        const isImage = fq.includes("image") || fq.includes("photo") || fq.includes("picture") || fq.includes("creative");
        const isTargeting = fq.includes("target") || fq.includes("location") || fq.includes("city") || fq.includes("where") || fq.includes("audience") || fq.includes("radius");
        const isSkippable = fq.includes("just do it") || fq.includes("auto");
        const chips = isBudget
          ? ["$10/day", "$15/day", "$25/day", "Custom"]
          : isLeadType
            ? ["Seller leads", "Buyer leads", "Both"]
            : isTargeting
              ? ["Use my service area", "I\u2019ll type a city"]
              : isAdCopy
                ? ["Write it for me", "I\u2019ll write my own"]
                : isImage
                  ? ["Use my listing photos", "Home valuation graphic", "Modern home with pool", "Luxury property at sunset"]
                  : isSkippable
                    ? ["Just do it", "Let me customize"]
                    : null;
        if (!chips) return null;
        return (
          <div className="flex flex-wrap gap-2 mt-2">
            {chips.map((chip) => (
              <button
                key={chip}
                onClick={() => { setInput(chip); sendToLam(chip); }}
                className="text-[13px] font-medium transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
                style={{
                  padding: "8px 16px",
                  borderRadius: 24,
                  backgroundColor: theme.accentGlow,
                  border: `1px solid ${theme.accentSoft}`,
                  color: theme.accent,
                  fontFamily: "var(--font-dm-sans), sans-serif",
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        );
      })()}

      {/* Follow-up Suggestions */}
      {message.followups && message.followups.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {message.followups.map((followup, index) => (
            <button
              key={index}
              onClick={() => handleFollowupClick(followup)}
              className="text-[13px] px-3.5 py-2 rounded-[20px] transition-all duration-150 active:scale-[0.97]"
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

      {/* Timestamp + Undo */}
      <div className="flex items-center justify-between">
        <span
          className="text-[10px]"
          style={{ color: theme.textMuted, opacity: 0.6 }}
        >
          {formattedTime}
        </span>

        {messageCanUndo && showUndo && (
          <button
            onClick={undoLastRun}
            className="flex items-center gap-1 text-xs transition-opacity duration-500"
            style={{
              color: theme.textMuted,
              fontSize: 12,
              opacity: showUndo ? 1 : 0,
            }}
          >
            <Undo2 className="h-3 w-3" />
            Undo
          </button>
        )}
      </div>
    </div>
  );
}
