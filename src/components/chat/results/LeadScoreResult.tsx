"use client";

import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import type { LamResponse } from "@/lib/assistant/types";

interface LeadScoreResultProps {
  result: unknown;
}

export function LeadScoreResult({ result }: LeadScoreResultProps) {
  const { theme } = useColonyTheme();

  const lamResult = result as LamResponse | undefined;
  const message = lamResult?.response?.message ?? "Lead scoring complete.";

  // Parse ranked leads from message (numbered items like "1. Name - score" or "1. Name (score)")
  const leads: Array<{ rank: number; name: string; signal: string; score: number }> = [];
  const leadRegex = /(\d+)[.)]\s*\*?\*?([^*\n(:\-]+)\*?\*?\s*[-\u2014(]?\s*(?:Score[:\s]*)?(\d+)?/gi;
  let match;
  while ((match = leadRegex.exec(message)) !== null) {
    leads.push({
      rank: parseInt(match[1]),
      name: match[2].trim(),
      signal: "",
      score: match[3] ? parseInt(match[3]) : 0,
    });
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: withAlpha(theme.accent, 0.06),
        border: `1px solid ${withAlpha(theme.accent, 0.12)}`,
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2"
        style={{ borderBottom: `1px solid ${withAlpha(theme.text, 0.06)}` }}
      >
        <span
          className="text-[13px] font-semibold"
          style={{
            color: theme.text,
            fontFamily: "var(--font-dm-sans), sans-serif",
          }}
        >
          Lead Scores
        </span>
      </div>

      {/* Leads or fallback message */}
      {leads.length > 0 ? (
        <div className="px-3 py-2.5 space-y-2">
          {leads.slice(0, 5).map((lead) => (
            <div key={lead.rank} className="flex items-center gap-2.5">
              <span
                className="text-[11px] font-mono font-bold flex-shrink-0"
                style={{
                  color: theme.accent,
                  width: 18,
                  textAlign: "right",
                }}
              >
                {lead.rank}
              </span>
              <div className="flex-1 min-w-0">
                <span
                  className="text-[13px] font-medium truncate block"
                  style={{
                    color: theme.text,
                    fontFamily: "var(--font-dm-sans), sans-serif",
                  }}
                >
                  {lead.name}
                </span>
              </div>
              {lead.score > 0 && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: Math.max(20, Math.min(60, lead.score * 0.6)),
                      backgroundColor: theme.accent,
                      opacity: 0.6 + (lead.score / 100) * 0.4,
                    }}
                  />
                  <span
                    className="text-[11px] font-mono"
                    style={{ color: theme.textMuted }}
                  >
                    {lead.score}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="px-3 py-2.5">
          <p
            className="text-[13px] leading-relaxed"
            style={{
              color: theme.textMuted,
              fontFamily: "var(--font-dm-sans), sans-serif",
            }}
          >
            {message}
          </p>
        </div>
      )}
    </div>
  );
}
