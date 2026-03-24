"use client";

import { Mail, Copy, Send, Pencil } from "lucide-react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import type { LamResponse } from "@/lib/assistant/types";

interface EmailResultProps {
  result: unknown;
}

export function EmailResult({ result }: EmailResultProps) {
  const { theme } = useColonyTheme();

  const lamResult = result as LamResponse | undefined;
  const message = lamResult?.response?.message ?? "Email ready.";

  // Try to extract subject/body from the response message
  const subjectMatch = message.match(/subject[:\s]*["\u201c]([^"\u201d]+)["\u201d]/i);
  const subject = subjectMatch?.[1] ?? null;

  // Get the first few lines as preview (after subject)
  const lines = message.split("\n").filter((l) => l.trim());
  const previewLines = lines.slice(0, 4).join("\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
  };

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: withAlpha(theme.accent, 0.06),
        border: `1px solid ${withAlpha(theme.accent, 0.12)}`,
      }}
    >
      {/* Email preview header */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: `1px solid ${withAlpha(theme.text, 0.06)}` }}
      >
        <Mail className="h-3.5 w-3.5" style={{ color: theme.accent }} />
        {subject ? (
          <span
            className="text-[13px] font-semibold truncate"
            style={{
              color: theme.text,
              fontFamily: "var(--font-dm-sans), sans-serif",
            }}
          >
            {subject}
          </span>
        ) : (
          <span
            className="text-[13px] font-medium"
            style={{
              color: theme.textSoft,
              fontFamily: "var(--font-dm-sans), sans-serif",
            }}
          >
            Email Draft
          </span>
        )}
      </div>

      {/* Body preview */}
      <div className="px-3 py-2.5">
        <p
          className="text-[13px] leading-relaxed line-clamp-3"
          style={{
            color: theme.textMuted,
            fontFamily: "var(--font-dm-sans), sans-serif",
          }}
        >
          {previewLines}
        </p>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderTop: `1px solid ${withAlpha(theme.text, 0.06)}` }}
      >
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
          style={{
            backgroundColor: withAlpha(theme.text, 0.06),
            color: theme.textSoft,
            fontFamily: "var(--font-dm-sans), sans-serif",
          }}
        >
          <Copy className="h-3 w-3" />
          Copy
        </button>
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
            backgroundColor: theme.accent,
            color: theme.bg,
            fontFamily: "var(--font-dm-sans), sans-serif",
          }}
        >
          <Send className="h-3 w-3" />
          Send
        </button>
      </div>
    </div>
  );
}
