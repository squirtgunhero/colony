"use client";

// ============================================
// COLONY ASSISTANT - Suggestion Chips
// Quick action suggestions when input is empty
// ============================================

import { cn } from "@/lib/utils";
import { SUGGESTION_CHIPS } from "@/lib/assistant/types";
import {
  UserPlus,
  Flame,
  Phone,
  CheckSquare,
  Mail,
  FileText,
} from "lucide-react";

interface SuggestionChipsProps {
  onChipClick: (prompt: string) => void;
}

const iconMap: Record<string, typeof UserPlus> = {
  "add-lead": UserPlus,
  "hot-leads": Flame,
  "log-call": Phone,
  "create-task": CheckSquare,
  "draft-email": Mail,
  "summarize": FileText,
};

export function SuggestionChips({ onChipClick }: SuggestionChipsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2 mb-3" suppressHydrationWarning>
      {SUGGESTION_CHIPS.map((chip) => {
        const Icon = iconMap[chip.id] || FileText;
        return (
          <button
            key={chip.id}
            onClick={() => onChipClick(chip.prompt)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full",
              "text-xs font-medium",
              "bg-card border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]",
              "text-muted-foreground hover:text-foreground",
              "shadow-sm hover:shadow-md",
              "transition-all duration-150 hover:-translate-y-0.5",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            )}
            suppressHydrationWarning
          >
            <Icon className="h-3.5 w-3.5" />
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}

