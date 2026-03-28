"use client";

import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import type { LucideIcon } from "lucide-react";

interface ActionButtonProps {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}

export function ActionButton({
  label,
  icon: Icon,
  onClick,
  variant = "primary",
  size = "md",
  disabled,
  type = "button",
  className = "",
}: ActionButtonProps) {
  const { theme } = useColonyTheme();

  const sizeClasses = size === "sm"
    ? "h-8 px-3.5 text-[12px] gap-1.5 rounded-lg"
    : "h-9 px-4 text-[13px] gap-2 rounded-xl";

  const getStyles = (): React.CSSProperties => {
    if (disabled) {
      return {
        backgroundColor: withAlpha(theme.text, 0.04),
        color: withAlpha(theme.text, 0.2),
        cursor: "not-allowed",
      };
    }
    switch (variant) {
      case "primary":
        return {
          backgroundColor: theme.accent,
          color: theme.bg,
        };
      case "secondary":
        return {
          backgroundColor: withAlpha(theme.text, 0.06),
          color: withAlpha(theme.text, 0.7),
        };
      case "ghost":
        return {
          backgroundColor: "transparent",
          color: withAlpha(theme.text, 0.5),
        };
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.97] ${sizeClasses} ${className}`}
      style={getStyles()}
      aria-label={label}
    >
      {Icon && <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} strokeWidth={1.5} />}
      {label}
    </button>
  );
}
