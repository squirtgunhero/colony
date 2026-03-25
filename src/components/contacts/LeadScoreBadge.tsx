"use client";

import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { getGradeColor } from "@/lib/lead-scoring";

interface LeadScoreBadgeProps {
  score: number;
  grade: string;
  compact?: boolean;
}

export function LeadScoreBadge({ score, grade, compact = false }: LeadScoreBadgeProps) {
  const { theme } = useColonyTheme();
  const color = getGradeColor(grade);

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
        style={{ backgroundColor: withAlpha(color, 0.15), color }}
        title={`Lead score: ${score}/100`}
      >
        {grade}
      </span>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg"
      style={{ backgroundColor: withAlpha(color, 0.1) }}
      title={`Lead score: ${score}/100`}
    >
      {/* Score ring */}
      <div className="relative" style={{ width: 28, height: 28 }}>
        <svg viewBox="0 0 28 28" className="transform -rotate-90" style={{ width: 28, height: 28 }}>
          <circle
            cx="14"
            cy="14"
            r="11"
            fill="none"
            stroke={withAlpha(color, 0.15)}
            strokeWidth="3"
          />
          <circle
            cx="14"
            cy="14"
            r="11"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={`${(score / 100) * 69.1} 69.1`}
            strokeLinecap="round"
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center text-[9px] font-bold"
          style={{ color }}
        >
          {grade}
        </span>
      </div>
      <div className="text-xs">
        <span className="font-semibold" style={{ color: theme.text }}>
          {score}
        </span>
        <span style={{ color: theme.textMuted }}>/100</span>
      </div>
    </div>
  );
}
