"use client";

import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  /** Optional breadcrumb-style overline text */
  overline?: string;
}

export function PageHeader({ title, subtitle, icon: Icon, actions, overline }: PageHeaderProps) {
  const { theme } = useColonyTheme();

  return (
    <header className="flex items-start justify-between gap-4 mb-8">
      <div className="flex items-start gap-3.5 min-w-0">
        {Icon && (
          <div
            className="flex items-center justify-center h-10 w-10 rounded-xl shrink-0 mt-0.5"
            style={{
              backgroundColor: withAlpha(theme.accent, 0.1),
              border: `1px solid ${withAlpha(theme.accent, 0.15)}`,
            }}
          >
            <Icon className="h-5 w-5" style={{ color: theme.accent }} />
          </div>
        )}
        <div className="min-w-0">
          {overline && (
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1"
              style={{ color: withAlpha(theme.text, 0.35) }}
            >
              {overline}
            </p>
          )}
          <h1
            className="text-[22px] font-semibold tracking-[-0.02em] truncate"
            style={{ fontFamily: "'Spectral', serif", color: theme.text }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-[13px] mt-0.5 leading-relaxed" style={{ color: withAlpha(theme.text, 0.4) }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}
