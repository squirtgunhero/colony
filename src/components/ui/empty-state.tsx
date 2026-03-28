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
      role="status"
    >
      <div
        className="flex items-center justify-center h-12 w-12 rounded-full mb-4"
        style={{
          backgroundColor: withAlpha(theme.text, 0.05),
        }}
      >
        <Icon
          className="h-5 w-5"
          style={{ color: withAlpha(theme.text, 0.3) }}
          strokeWidth={1.5}
        />
      </div>
      <h3
        className="text-[15px] font-semibold mb-1"
        style={{ color: withAlpha(theme.text, 0.6) }}
      >
        {title}
      </h3>
      <p
        className="text-[13px] max-w-[280px] leading-relaxed"
        style={{ color: withAlpha(theme.text, 0.35) }}
      >
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
