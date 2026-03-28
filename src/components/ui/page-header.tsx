"use client";

import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  overline?: string;
}

export function PageHeader({ title, subtitle, icon: Icon, actions, overline }: PageHeaderProps) {
  const { theme } = useColonyTheme();

  return (
    <header className="flex items-start justify-between gap-6 mb-8">
      <div className="min-w-0">
        {overline && (
          <p
            className="text-[11px] font-medium uppercase tracking-[0.06em] mb-1.5"
            style={{ color: withAlpha(theme.text, 0.4) }}
          >
            {overline}
          </p>
        )}
        <div className="flex items-center gap-3">
          {Icon && (
            <Icon
              className="h-6 w-6 shrink-0"
              style={{ color: withAlpha(theme.text, 0.3) }}
              strokeWidth={1.5}
            />
          )}
          <h1
            className="text-[28px] font-semibold tracking-[-0.025em]"
            style={{
              fontFamily: "'Manrope', var(--font-inter), sans-serif",
              color: theme.text,
            }}
          >
            {title}
          </h1>
        </div>
        {subtitle && (
          <p
            className="text-[14px] mt-1 leading-relaxed"
            style={{ color: withAlpha(theme.text, 0.45) }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0 pt-1">{actions}</div>}
    </header>
  );
}
