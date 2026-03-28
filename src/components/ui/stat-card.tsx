"use client";

import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  delta?: { value: string; positive?: boolean };
  color?: string;
}

export function StatCard({ label, value, icon: Icon, delta, color }: StatCardProps) {
  const { theme } = useColonyTheme();
  const accentColor = color || theme.text;

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        backgroundColor: withAlpha(theme.text, 0.03),
      }}
      role="group"
      aria-label={`${label}: ${value}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[11px] font-medium uppercase tracking-[0.06em]"
          style={{ color: withAlpha(theme.text, 0.4) }}
        >
          {label}
        </span>
        {Icon && (
          <Icon
            className="h-4 w-4"
            style={{ color: withAlpha(accentColor, 0.4) }}
            strokeWidth={1.5}
          />
        )}
      </div>
      <p
        className="text-[26px] font-semibold tracking-[-0.03em] leading-none"
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
          style={{ color: delta.positive ? "var(--success)" : "var(--destructive)" }}
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

  return <div className={`grid ${colClass} gap-3`}>{children}</div>;
}
