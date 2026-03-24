"use client";

import { ExternalLink, Undo2 } from "lucide-react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { useAssistantStore } from "@/lib/assistant/store";
import type { LamResponse } from "@/lib/assistant/types";

interface CRMResultProps {
  result: unknown;
}

export function CRMResult({ result }: CRMResultProps) {
  const { theme } = useColonyTheme();
  const { undoLastRun, canUndo, lastRunId } = useAssistantStore();

  const lamResult = result as LamResponse | undefined;
  const execResult = lamResult?.execution_result;
  const message = lamResult?.response?.message ?? execResult?.user_summary ?? "Action completed.";
  const runId = lamResult?.run_id;
  const showUndo = canUndo && runId === lastRunId;

  return (
    <div
      className="rounded-xl p-3"
      style={{
        backgroundColor: withAlpha(theme.accent, 0.06),
        border: `1px solid ${withAlpha(theme.accent, 0.12)}`,
      }}
    >
      <p
        className="text-[13px] leading-relaxed"
        style={{
          color: theme.textSoft,
          fontFamily: "var(--font-dm-sans), sans-serif",
        }}
      >
        {message}
      </p>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-2.5">
        {execResult && (
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: withAlpha(theme.accent, 0.12),
              color: theme.accent,
            }}
          >
            {execResult.actions_executed} action{execResult.actions_executed !== 1 ? "s" : ""} completed
          </span>
        )}

        {showUndo && (
          <button
            onClick={undoLastRun}
            className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
            style={{
              backgroundColor: withAlpha(theme.text, 0.06),
              color: theme.textMuted,
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
