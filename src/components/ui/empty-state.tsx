"use client";

import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  const { theme } = useColonyTheme();

  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-6 rounded-2xl text-center"
      style={{
        backgroundColor: withAlpha(theme.text, 0.015),
        border: `1px dashed ${withAlpha(theme.text, 0.08)}`,
      }}
      role="status"
    >
      <div
        className="flex items-center justify-center h-14 w-14 rounded-2xl mb-5"
        style={{
          backgroundColor: withAlpha(theme.accent, 0.08),
          border: `1px solid ${withAlpha(theme.accent, 0.12)}`,
        }}
      >
        <Icon className="h-6 w-6" style={{ color: withAlpha(theme.accent, 0.5) }} />
      </div>
      <h3
        className="text-[15px] font-semibold mb-1.5"
        style={{ color: withAlpha(theme.text, 0.7) }}
      >
        {title}
      </h3>
      <p
        className="text-[13px] max-w-[320px] leading-relaxed"
        style={{ color: withAlpha(theme.text, 0.4) }}
      >
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
