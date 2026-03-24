"use client";

import { Send, Pencil, Clock } from "lucide-react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import type { LamResponse } from "@/lib/assistant/types";

interface SocialResultProps {
  result: unknown;
}

export function SocialResult({ result }: SocialResultProps) {
  const { theme } = useColonyTheme();

  const lamResult = result as LamResponse | undefined;
  const message = lamResult?.response?.message ?? "Social post ready.";

  // Extract the first few lines as the post preview
  const lines = message.split("\n").filter((l) => l.trim());
  const preview = lines.slice(0, 5).join("\n");

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: withAlpha(theme.accent, 0.06),
        border: `1px solid ${withAlpha(theme.accent, 0.12)}`,
      }}
    >
      {/* Post preview */}
      <div className="px-3 py-2.5">
        <p
          className="text-[13px] leading-relaxed whitespace-pre-wrap line-clamp-5"
          style={{
            color: theme.textSoft,
            fontFamily: "var(--font-dm-sans), sans-serif",
          }}
        >
          {preview}
        </p>
      </div>

      {/* Visual placeholder */}
      <div
        className="mx-3 mb-2.5 rounded-lg flex items-center justify-center"
        style={{
          height: 80,
          backgroundColor: withAlpha(theme.text, 0.04),
          border: `1px dashed ${withAlpha(theme.text, 0.1)}`,
        }}
      >
        <span
          className="text-[11px]"
          style={{ color: theme.textMuted }}
        >
          Visual preview
        </span>
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
          <Pencil className="h-3 w-3" />
          Edit
        </button>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
          style={{
            backgroundColor: withAlpha(theme.text, 0.06),
            color: theme.textSoft,
            fontFamily: "var(--font-dm-sans), sans-serif",
          }}
        >
          <Clock className="h-3 w-3" />
          Schedule
        </button>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
          style={{
            backgroundColor: theme.accent,
            color: theme.bg,
            fontFamily: "var(--font-dm-sans), sans-serif",
          }}
        >
          <Send className="h-3 w-3" />
          Post Now
        </button>
      </div>
    </div>
  );
}
