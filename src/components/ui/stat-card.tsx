"use client";

import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  delta?: { value: string; positive?: boolean };
  /** Accent color override (hex) */
  color?: string;
}

export function StatCard({ label, value, icon: Icon, delta, color }: StatCardProps) {
  const { theme } = useColonyTheme();
  const accentColor = color || theme.accent;

  return (
    <div
      className="rounded-2xl p-5 transition-all duration-200 hover:translate-y-[-1px] group"
      style={{
        backgroundColor: withAlpha(theme.text, 0.025),
        border: `1px solid ${withAlpha(theme.text, 0.06)}`,
      }}
      role="group"
      aria-label={`${label}: ${value}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.1em]"
          style={{ color: withAlpha(theme.text, 0.35) }}
        >
          {label}
        </span>
        {Icon && (
          <div
            className="flex items-center justify-center h-8 w-8 rounded-lg transition-colors duration-200"
            style={{
              backgroundColor: withAlpha(accentColor, 0.08),
            }}
          >
            <Icon className="h-4 w-4" style={{ color: withAlpha(accentColor, 0.6) }} />
          </div>
        )}
      </div>
      <p
        className="text-[28px] font-bold tracking-[-0.03em] leading-none"
        style={{
          fontFamily: "'Manrope', var(--font-inter), sans-serif",
          fontVariantNumeric: "tabular-nums",
          color: theme.text,
        }}
      >
        {value}
      </p>
      {delta && (
        <p
          className="text-[12px] font-medium mt-2 flex items-center gap-1"
          style={{ color: delta.positive ? "#4ade80" : "#f87171" }}
        >
          <span>{delta.positive ? "\u2191" : "\u2193"}</span>
          {delta.value}
        </p>
      )}
    </div>
  );
}

interface StatGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
}

export function StatGrid({ children, columns = 3 }: StatGridProps) {
  const colClass =
    columns === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : columns === 4
        ? "grid-cols-2 sm:grid-cols-4"
        : "grid-cols-1 sm:grid-cols-3";

  return <div className={`grid ${colClass} gap-4`}>{children}</div>;
}
