"use client";

import { useEffect, useState } from "react";
import { Check, AlertCircle, Loader2 } from "lucide-react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import type { ExecutionStep as ExecutionStepType } from "@/lib/assistant/types";

interface ExecutionStepProps {
  step: ExecutionStepType;
  isLast: boolean;
  index: number;
}

export function ExecutionStepItem({ step, isLast, index }: ExecutionStepProps) {
  const { theme } = useColonyTheme();
  const [elapsed, setElapsed] = useState(0);
  const [visible, setVisible] = useState(step.status !== "pending");

  // Fade in when becoming active
  useEffect(() => {
    if (step.status !== "pending" && !visible) {
      setVisible(true);
    }
  }, [step.status, visible]);

  // Elapsed timer for active steps
  useEffect(() => {
    if (step.status !== "active") return;
    const start = step.startedAt ?? Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [step.status, step.startedAt]);

  const isComplete = step.status === "complete";
  const isActive = step.status === "active";
  const isError = step.status === "error";
  const isAwaitingApproval = step.status === "awaiting_approval";
  const isPending = step.status === "pending";

  // Node indicator colors
  const nodeColor = isComplete
    ? theme.accent
    : isActive
      ? theme.accent
      : isError
        ? "#E54D4D"
        : isAwaitingApproval
          ? theme.accent
          : withAlpha(theme.text, 0.2);

  // Connector line color
  const lineColor = isComplete ? theme.accent : withAlpha(theme.text, 0.1);

  const formatElapsed = (s: number) => {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <div
      className="flex gap-3 relative"
      style={{
        opacity: isPending ? 0.35 : 1,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 300ms ease-out, transform 300ms ease-out",
        animationDelay: `${index * 100}ms`,
      }}
    >
      {/* Vertical stepper column */}
      <div className="flex flex-col items-center flex-shrink-0" style={{ width: 24 }}>
        {/* Node */}
        <div
          className="relative flex items-center justify-center rounded-full"
          style={{
            width: 20,
            height: 20,
            flexShrink: 0,
            border: `2px solid ${nodeColor}`,
            backgroundColor: isComplete || isActive
              ? withAlpha(theme.accent, 0.15)
              : "transparent",
            transition: "all 300ms ease",
          }}
        >
          {isComplete && (
            <Check className="h-3 w-3" style={{ color: theme.accent }} />
          )}
          {isActive && (
            <Loader2
              className="h-3 w-3 animate-spin"
              style={{ color: theme.accent }}
            />
          )}
          {isError && (
            <AlertCircle className="h-3 w-3" style={{ color: "#E54D4D" }} />
          )}
          {isAwaitingApproval && (
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: theme.accent }}
            />
          )}

          {/* Active pulse ring */}
          {isActive && (
            <div
              className="absolute inset-0 rounded-full"
              style={{
                border: `2px solid ${theme.accent}`,
                animation: "executionPulse 1.5s ease-in-out infinite",
              }}
            />
          )}
        </div>

        {/* Connector line */}
        {!isLast && (
          <div
            style={{
              width: 2,
              flex: 1,
              minHeight: 16,
              backgroundColor: lineColor,
              transition: "background-color 300ms ease",
            }}
          />
        )}
      </div>

      {/* Step content */}
      <div className="flex-1 pb-4 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-sm font-semibold"
            style={{
              color: isPending ? theme.textMuted : theme.text,
              fontFamily: "var(--font-dm-sans), sans-serif",
              transition: "color 300ms ease",
            }}
          >
            {step.label}
          </span>

          {/* Elapsed time */}
          {isActive && elapsed > 0 && (
            <span
              className="text-[11px] font-mono flex-shrink-0"
              style={{ color: theme.textMuted }}
            >
              {formatElapsed(elapsed)}
            </span>
          )}

          {/* Completed time */}
          {isComplete && step.startedAt && step.completedAt && (
            <span
              className="text-[11px] font-mono flex-shrink-0"
              style={{ color: withAlpha(theme.text, 0.3) }}
            >
              {formatElapsed(Math.max(1, Math.floor((step.completedAt - step.startedAt) / 1000)))}
            </span>
          )}
        </div>

        <p
          className="text-[13px] mt-0.5 leading-relaxed"
          style={{
            color: isPending ? withAlpha(theme.text, 0.25) : theme.textMuted,
            fontFamily: "var(--font-dm-sans), sans-serif",
            transition: "color 300ms ease",
          }}
        >
          {step.detail}
        </p>

        {/* Error message */}
        {isError && step.result != null && (
          <p
            className="text-[12px] mt-1.5 px-2 py-1 rounded"
            style={{
              color: "#E54D4D",
              backgroundColor: "rgba(229, 77, 77, 0.1)",
            }}
          >
            {typeof step.result === "string" ? step.result : "An error occurred"}
          </p>
        )}
      </div>
    </div>
  );
}
