"use client";

// ============================================
// COLONY ASSISTANT - Slash Command Menu
// Keyboard-navigable command palette
// ============================================

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { SLASH_COMMANDS } from "@/lib/assistant/types";
import {
  UserPlus,
  CheckSquare,
  FileText,
  Search,
  Mail,
  BookOpen,
} from "lucide-react";

interface SlashCommandMenuProps {
  query: string;
  onSelect: (command: string) => void;
  onClose: () => void;
}

const iconMap: Record<string, typeof UserPlus> = {
  UserPlus,
  CheckSquare,
  FileText,
  Search,
  Mail,
  BookOpen,
};

export function SlashCommandMenu({ query, onSelect, onClose }: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter commands based on query
  const filteredCommands = SLASH_COMMANDS.filter((cmd) =>
    cmd.command.toLowerCase().includes(query.toLowerCase()) ||
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex].command);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [filteredCommands, selectedIndex, onSelect, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    const selected = list?.children[selectedIndex] as HTMLElement;
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (filteredCommands.length === 0) {
    return null;
  }

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label="Slash commands"
      className={cn(
        "absolute bottom-full left-0 right-0 mb-2",
        "max-h-[280px] overflow-auto rounded-xl",
        "bg-card border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)]",
        "shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
        "dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
        "p-1"
      )}
    >
      {filteredCommands.map((cmd, index) => {
        const Icon = iconMap[cmd.icon] || FileText;
        const isSelected = index === selectedIndex;

        return (
          <button
            key={cmd.id}
            role="option"
            aria-selected={isSelected}
            onClick={() => onSelect(cmd.command)}
            className={cn(
              "flex w-full items-center gap-3 px-3 py-2.5 rounded-lg",
              "text-left transition-colors duration-100",
              isSelected
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              isSelected ? "bg-primary/10 text-primary" : "bg-muted/50"
            )}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{cmd.label}</div>
              <div className="text-xs text-muted-foreground truncate">
                {cmd.description}
              </div>
            </div>
            <code className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {cmd.command}
            </code>
          </button>
        );
      })}
    </div>
  );
}

