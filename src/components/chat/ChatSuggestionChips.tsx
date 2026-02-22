"use client";

import { useModeStore, type SuggestionChip } from "@/lib/mode";
import { useAssistantStore } from "@/lib/assistant/store";
import { useColonyTheme } from "@/lib/chat-theme-context";
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
  const { theme } = useColonyTheme();

  if (activeChips.length === 0) {
    return null;
  }

  const handleChipClick = (chip: SuggestionChip) => {
    setInput(chip.action);
    clearChips();
  };

  const chipShadow = `3px 3px 6px rgba(0,0,0,0.4), -3px -3px 6px rgba(255,255,255,0.04)`;

  return (
    <div className="flex flex-wrap gap-2 mt-3 max-w-md animate-in fade-in slide-in-from-bottom-1 duration-200">
      {activeChips.slice(0, 4).map((chip) => {
        const Icon = iconMap[chip.icon || ""] || ArrowRight;
        return (
          <button
            key={chip.id}
            onClick={() => handleChipClick(chip)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-300 focus:outline-none"
            style={{
              color: theme.text,
              opacity: 0.7,
              backgroundColor: theme.bgGlow,
              border: "none",
              boxShadow: chipShadow,
              fontFamily: "var(--font-dm-sans), sans-serif",
            }}
          >
            <Icon className="h-3 w-3" />
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
