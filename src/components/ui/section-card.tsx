"use client";

import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
  className?: string;
}

export function SectionCard({ title, subtitle, actions, children, noPadding, className = "" }: SectionCardProps) {
  const { theme } = useColonyTheme();
  const borderColor = withAlpha(theme.text, 0.06);

  return (
    <div
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{
        backgroundColor: withAlpha(theme.text, 0.02),
        border: `1px solid ${borderColor}`,
      }}
    >
      {(title || actions) && (
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${borderColor}` }}
        >
          <div>
            {title && (
              <h2 className="text-[15px] font-semibold tracking-[-0.01em]" style={{ color: theme.text }}>
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-[12px] mt-0.5" style={{ color: withAlpha(theme.text, 0.4) }}>
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={noPadding ? "" : "p-5"}>{children}</div>
    </div>
  );
}
