"use client";

import { useMemo } from "react";
import {
  UserPlus, UserCog, UserMinus, Search, DollarSign, RefreshCw,
  ArrowRight, Trash2, CheckSquare, CheckCircle, FileText, Mail,
  Send, MessageSquare, Megaphone, BarChart3, TrendingUp, Sparkles,
  Zap, PauseCircle, PlayCircle, Rocket, Eye, Bell, Globe,
  MinusCircle, Image, PenTool, Users, Upload, BookmarkPlus,
  FileSignature, FileSearch, Workflow, List, Flag, XCircle, RotateCcw,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { ExecutionStepItem } from "./ExecutionStep";
import { CRMResult } from "./results/CRMResult";
import { EmailResult } from "./results/EmailResult";
import { SequenceResult } from "./results/SequenceResult";
import { LeadScoreResult } from "./results/LeadScoreResult";
import { ReportResult } from "./results/ReportResult";
import { SocialResult } from "./results/SocialResult";
import type { ActionExecution } from "@/lib/assistant/types";

interface ActionExecutionCardProps {
  execution: ActionExecution;
  onRetry?: () => void;
  onCancel?: () => void;
  onApprove?: () => void;
}

const ICON_MAP: Record<string, LucideIcon> = {
  UserPlus, UserCog, UserMinus, Search, DollarSign, RefreshCw,
  ArrowRight, Trash2, CheckSquare, CheckCircle, FileText, Mail,
  Send, MessageSquare, Megaphone, BarChart3, TrendingUp, Sparkles,
  Zap, PauseCircle, PlayCircle, Rocket, Eye, Bell, Globe,
  MinusCircle, Image, PenTool, Users, Upload, BookmarkPlus,
  FileSignature, FileSearch, Workflow, List, Flag, Building2,
};

const RESULT_RENDERERS: Record<string, React.ComponentType<{ result: unknown }>> = {
  CRMResult,
  EmailResult,
  SequenceResult,
  LeadScoreResult,
  ReportResult,
  SocialResult,
};

export function ActionExecutionCard({
  execution,
  onRetry,
  onCancel,
  onApprove,
}: ActionExecutionCardProps) {
  const { theme } = useColonyTheme();

  const IconComponent = ICON_MAP[execution.icon] ?? Sparkles;
  const isRunning = execution.status === "running";
  const isComplete = execution.status === "complete";
  const isError = execution.status === "error";
  const isAwaitingApproval = execution.status === "awaiting_approval";
  const isCancelled = execution.status === "cancelled";

  const completedCount = execution.steps.filter((s) => s.status === "complete").length;
  const totalSteps = execution.steps.length;
  const progress = totalSteps > 0 ? completedCount / totalSteps : 0;

  // Determine result renderer from the action step definitions
  const ResultRenderer = useMemo(() => {
    // Try to get from the result data or fall back to CRMResult
    const resultData = execution.result as Record<string, unknown> | undefined;
    const rendererName = (resultData?.__resultRenderer as string) ?? "CRMResult";
    return RESULT_RENDERERS[rendererName] ?? CRMResult;
  }, [execution.result]);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: withAlpha(theme.text, 0.04),
        border: `1px solid ${withAlpha(theme.text, 0.08)}`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{
          borderBottom: `1px solid ${withAlpha(theme.text, 0.06)}`,
        }}
      >
        <div
          className="flex items-center justify-center rounded-lg"
          style={{
            width: 32,
            height: 32,
            backgroundColor: withAlpha(theme.accent, 0.12),
          }}
        >
          <IconComponent
            className="h-4 w-4"
            style={{ color: theme.accent }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-semibold truncate"
            style={{
              color: theme.text,
              fontFamily: "var(--font-dm-sans), sans-serif",
            }}
          >
            {execution.label}
          </h3>
          {isRunning && (
            <p
              className="text-[11px]"
              style={{ color: theme.textMuted }}
            >
              Step {completedCount + 1} of {totalSteps}
            </p>
          )}
          {isComplete && (
            <p
              className="text-[11px]"
              style={{ color: withAlpha(theme.accent, 0.7) }}
            >
              Completed
            </p>
          )}
          {isError && (
            <p className="text-[11px]" style={{ color: "#E54D4D" }}>
              Failed
            </p>
          )}
          {isAwaitingApproval && (
            <p
              className="text-[11px]"
              style={{ color: theme.accent }}
            >
              Awaiting approval
            </p>
          )}
          {isCancelled && (
            <p
              className="text-[11px]"
              style={{ color: theme.textMuted }}
            >
              Cancelled
            </p>
          )}
        </div>

        {/* Progress ring for running state */}
        {isRunning && (
          <div className="relative" style={{ width: 28, height: 28 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" className="-rotate-90">
              <circle
                cx="14" cy="14" r="11"
                fill="none"
                stroke={withAlpha(theme.text, 0.1)}
                strokeWidth="2.5"
              />
              <circle
                cx="14" cy="14" r="11"
                fill="none"
                stroke={theme.accent}
                strokeWidth="2.5"
                strokeDasharray={`${2 * Math.PI * 11}`}
                strokeDashoffset={`${2 * Math.PI * 11 * (1 - progress)}`}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 300ms ease" }}
              />
            </svg>
          </div>
        )}

        {/* Complete checkmark */}
        {isComplete && (
          <CheckCircle
            className="h-5 w-5 flex-shrink-0"
            style={{ color: theme.accent }}
          />
        )}

        {/* Error icon */}
        {isError && (
          <XCircle
            className="h-5 w-5 flex-shrink-0"
            style={{ color: "#E54D4D" }}
          />
        )}
      </div>

      {/* Steps */}
      <div className="px-4 pt-3 pb-1">
        {execution.steps.map((step, index) => (
          <ExecutionStepItem
            key={step.id}
            step={step}
            isLast={index === execution.steps.length - 1}
            index={index}
          />
        ))}
      </div>

      {/* Approval Gate */}
      {isAwaitingApproval && (
        <div
          className="mx-4 mb-3 p-3 rounded-xl"
          style={{
            backgroundColor: withAlpha(theme.accent, 0.08),
            border: `1px solid ${withAlpha(theme.accent, 0.2)}`,
          }}
        >
          <p
            className="text-[13px] mb-3"
            style={{
              color: theme.textSoft,
              fontFamily: "var(--font-dm-sans), sans-serif",
            }}
          >
            This action requires your approval before proceeding.
          </p>
          <div className="flex gap-2">
            {onApprove && (
              <button
                onClick={onApprove}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
                style={{
                  backgroundColor: theme.accent,
                  color: theme.bg,
                  fontFamily: "var(--font-dm-sans), sans-serif",
                }}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Approve
              </button>
            )}
            {onCancel && (
              <button
                onClick={onCancel}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
                style={{
                  backgroundColor: withAlpha(theme.text, 0.06),
                  color: theme.textMuted,
                  fontFamily: "var(--font-dm-sans), sans-serif",
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Result */}
      {isComplete && execution.result && (
        <div
          className="px-4 pb-3"
          style={{
            animation: "executionResultSlideUp 400ms ease-out",
          }}
        >
          <ResultRenderer result={execution.result} />
        </div>
      )}

      {/* Error actions */}
      {isError && (
        <div className="px-4 pb-3 flex gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
              style={{
                backgroundColor: withAlpha(theme.text, 0.06),
                color: theme.textSoft,
                fontFamily: "var(--font-dm-sans), sans-serif",
              }}
            >
              <RotateCcw className="h-3 w-3" />
              Retry
            </button>
          )}
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150"
              style={{
                color: theme.textMuted,
                fontFamily: "var(--font-dm-sans), sans-serif",
              }}
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* CSS Keyframes */}
      <style jsx global>{`
        @keyframes executionPulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0; transform: scale(1.8); }
        }
        @keyframes executionResultSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
