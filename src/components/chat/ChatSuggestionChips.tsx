"use client";

// ============================================
// COLONY - Chat Suggestion Chips
// Context-aware action suggestions
// Appear after assistant messages, disappear after action
// ============================================

import { cn } from "@/lib/utils";
import { useModeStore, type SuggestionChip } from "@/lib/mode";
import { useAssistantStore } from "@/lib/assistant/store";
import {
  UserPlus,
  Handshake,
  CheckSquare,
  Phone,
  Eye,
  ArrowRight,
} from "lucide-react";

const iconMap: Record<string, typeof UserPlus> = {
  "create-contact": UserPlus,
  "create-deal": Handshake,
  "create-task": CheckSquare,
  "log-call": Phone,
  "view": Eye,
  "follow-up": ArrowRight,
};

export function ChatSuggestionChips() {
  const { activeChips, clearChips } = useModeStore();
  const { setInput } = useAssistantStore();

  if (activeChips.length === 0) {
    return null;
  }

  const handleChipClick = (chip: SuggestionChip) => {
    setInput(chip.action);
    clearChips(); // Clear after click
  };

  return (
    <div className="flex flex-wrap gap-1.5 mt-3 ml-11 max-w-md animate-in fade-in slide-in-from-bottom-1 duration-200">
      {activeChips.slice(0, 4).map((chip) => {
        const Icon = iconMap[chip.icon || ""] || ArrowRight;
        return (
          <button
            key={chip.id}
            onClick={() => handleChipClick(chip)}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
              "text-[11px] font-medium",
              "bg-muted/50 hover:bg-muted",
              "text-muted-foreground hover:text-foreground",
              "border border-transparent hover:border-border/50",
              "transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-primary/20"
            )}
          >
            <Icon className="h-3 w-3" />
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
