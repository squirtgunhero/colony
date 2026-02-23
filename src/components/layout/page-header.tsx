"use client";

import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  const { theme } = useColonyTheme();

  return (
    <div
      className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6"
      style={{ borderBottom: `1px solid ${withAlpha(theme.text, 0.06)}` }}
    >
      <div className="min-w-0">
        <h1
          className="text-[28px] leading-tight font-semibold tracking-[-0.01em]"
          style={{
            color: theme.text,
            fontFamily: "'Spectral', serif",
          }}
        >
          {title}
        </h1>
        {description && (
          <p
            className="mt-1 text-sm line-clamp-2"
            style={{
              color: theme.textMuted,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex shrink-0 items-center gap-3">{children}</div>}
    </div>
  );
}
