"use client";

import { Download, Share2 } from "lucide-react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import type { LamResponse } from "@/lib/assistant/types";

interface ReportResultProps {
  result: unknown;
}

export function ReportResult({ result }: ReportResultProps) {
  const { theme } = useColonyTheme();

  const lamResult = result as LamResponse | undefined;
  const message = lamResult?.response?.message ?? "Report generated.";

  // Try to extract metrics from the message (patterns like "$X" or "X%" or "X leads")
  const metrics: Array<{ value: string; label: string }> = [];
  const dollarMatch = message.match(/\$[\d,.]+[KMB]?/g);
  const percentMatch = message.match(/[\d.]+%/g);
  const countMatch = message.match(/(\d+)\s+(leads?|deals?|contacts?|campaigns?|tasks?)/gi);

  if (dollarMatch) {
    dollarMatch.slice(0, 2).forEach((v) => {
      metrics.push({ value: v, label: "Value" });
    });
  }
  if (percentMatch) {
    percentMatch.slice(0, 2).forEach((v) => {
      metrics.push({ value: v, label: "Rate" });
    });
  }
  if (countMatch) {
    countMatch.slice(0, 2).forEach((v) => {
      const parts = v.match(/(\d+)\s+(\w+)/);
      if (parts) {
        metrics.push({ value: parts[1], label: parts[2] });
      }
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
      {/* Metrics row */}
      {metrics.length > 0 && (
        <div
          className="flex gap-4 px-3 py-3"
          style={{ borderBottom: `1px solid ${withAlpha(theme.text, 0.06)}` }}
        >
          {metrics.slice(0, 4).map((metric, i) => (
            <div key={i} className="text-center">
              <p
                className="text-lg font-mono font-semibold"
                style={{ color: theme.accent }}
              >
                {metric.value}
              </p>
              <p
                className="text-[10px] uppercase tracking-wide"
                style={{
                  color: theme.textMuted,
                  fontFamily: "var(--font-dm-sans), sans-serif",
                }}
              >
                {metric.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Summary text */}
      <div className="px-3 py-2.5">
        <p
          className="text-[13px] leading-relaxed line-clamp-4"
          style={{
            color: theme.textMuted,
            fontFamily: "var(--font-dm-sans), sans-serif",
          }}
        >
          {message}
        </p>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderTop: `1px solid ${withAlpha(theme.text, 0.06)}` }}
      >
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
          style={{
            backgroundColor: withAlpha(theme.text, 0.06),
            color: theme.textSoft,
            fontFamily: "var(--font-dm-sans), sans-serif",
          }}
        >
          <Download className="h-3 w-3" />
          Export
        </button>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
          style={{
            backgroundColor: withAlpha(theme.text, 0.06),
            color: theme.textSoft,
            fontFamily: "var(--font-dm-sans), sans-serif",
          }}
        >
          <Share2 className="h-3 w-3" />
          Share
        </button>
      </div>
    </div>
  );
}
