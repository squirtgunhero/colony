"use client";

import { Mail, MessageSquare, Phone, PlayCircle, Pencil } from "lucide-react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import type { LamResponse } from "@/lib/assistant/types";

interface SequenceResultProps {
  result: unknown;
}

const CHANNEL_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  email: Mail,
  sms: MessageSquare,
  call: Phone,
};

export function SequenceResult({ result }: SequenceResultProps) {
  const { theme } = useColonyTheme();

  const lamResult = result as LamResponse | undefined;
  const message = lamResult?.response?.message ?? "Follow-up sequence created.";

  // Parse simple touchpoints from the message (lines like "Day 1: ..." or "- Day 1: ...")
  const touchpoints: Array<{ day: string; description: string; channel: string }> = [];
  const dayRegex = /(?:^|\n)\s*[-\u2022]?\s*(?:Day\s+)?(\d+)[\s:.\-]+(.+)/gi;
  let match;
  while ((match = dayRegex.exec(message)) !== null) {
    const desc = match[2].trim();
    const channel = desc.toLowerCase().includes("email")
      ? "email"
      : desc.toLowerCase().includes("sms") || desc.toLowerCase().includes("text")
        ? "sms"
        : desc.toLowerCase().includes("call")
          ? "call"
          : "email";
    touchpoints.push({ day: `Day ${match[1]}`, description: desc, channel });
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
          Follow-up Sequence
        </span>
        {touchpoints.length > 0 && (
          <span
            className="text-[11px] ml-2"
            style={{ color: theme.textMuted }}
          >
            {touchpoints.length} touchpoints
          </span>
        )}
      </div>

      {/* Timeline */}
      {touchpoints.length > 0 ? (
        <div className="px-3 py-2.5 space-y-2">
          {touchpoints.map((tp, i) => {
            const ChannelIcon = CHANNEL_ICONS[tp.channel] ?? Mail;
            return (
              <div key={i} className="flex items-start gap-2.5">
                <div
                  className="flex items-center justify-center rounded-full flex-shrink-0 mt-0.5"
                  style={{
                    width: 22,
                    height: 22,
                    backgroundColor: withAlpha(theme.accent, 0.12),
                  }}
                >
                  <ChannelIcon className="h-3 w-3" style={{ color: theme.accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: theme.accent }}
                  >
                    {tp.day}
                  </span>
                  <p
                    className="text-[12px] leading-relaxed truncate"
                    style={{
                      color: theme.textMuted,
                      fontFamily: "var(--font-dm-sans), sans-serif",
                    }}
                  >
                    {tp.description}
                  </p>
                </div>
              </div>
            );
          })}
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
            backgroundColor: theme.accent,
            color: theme.bg,
            fontFamily: "var(--font-dm-sans), sans-serif",
          }}
        >
          <PlayCircle className="h-3 w-3" />
          Activate
        </button>
      </div>
    </div>
  );
}
