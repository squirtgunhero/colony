"use client";

// ============================================
// COLONY - Chat Slash Command Menu
// Extended commands for Chat Mode
// ============================================

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  UserPlus,
  CheckSquare,
  FileText,
  Search,
  Mail,
  BookOpen,
  BarChart3,
  User,
  Handshake,
  Phone,
  Undo2,
} from "lucide-react";

interface SlashCommandMenuProps {
  query: string;
  onSelect: (command: string) => void;
  onClose: () => void;
}

interface SlashCommand {
  id: string;
  command: string;
  label: string;
  description: string;
  icon: typeof UserPlus;
  category: "create" | "view" | "action" | "other";
}

const CHAT_SLASH_COMMANDS: SlashCommand[] = [
  // Create commands
  { id: "create-contact", command: "/create-contact", label: "Create Contact", description: "Add a new contact to CRM", icon: UserPlus, category: "create" },
  { id: "create-deal", command: "/create-deal", label: "Create Deal", description: "Start a new deal", icon: Handshake, category: "create" },
  { id: "create-task", command: "/create-task", label: "Create Task", description: "Add a new task", icon: CheckSquare, category: "create" },
  
  // View commands - open drawer
  { id: "show-pipeline", command: "/show-pipeline", label: "Show Pipeline", description: "View pipeline overview in drawer", icon: BarChart3, category: "view" },
  { id: "show-contact", command: "/show-contact", label: "Show Contact", description: "View contact details", icon: User, category: "view" },
  { id: "show-deal", command: "/show-deal", label: "Show Deal", description: "View deal details", icon: Handshake, category: "view" },
  
  // Action commands
  { id: "log-call", command: "/log-call", label: "Log Call", description: "Record a call note", icon: Phone, category: "action" },
  { id: "summarize", command: "/summarize", label: "Summarize", description: "Get a summary of current item", icon: BookOpen, category: "action" },
  { id: "search", command: "/search", label: "Search", description: "Search contacts, deals, properties", icon: Search, category: "action" },
  { id: "draft-email", command: "/draft-email", label: "Draft Email", description: "Compose an email", icon: Mail, category: "action" },
  
  // Other
  { id: "undo", command: "/undo", label: "Undo", description: "Undo the last action", icon: Undo2, category: "other" },
];

export function ChatSlashCommandMenu({ query, onSelect, onClose }: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter commands based on query
  const filteredCommands = CHAT_SLASH_COMMANDS.filter((cmd) =>
    cmd.command.toLowerCase().includes(query.toLowerCase()) ||
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  // Group by category
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, SlashCommand[]>);

  const categoryOrder = ["create", "view", "action", "other"];
  const categoryLabels: Record<string, string> = {
    create: "Create",
    view: "View",
    action: "Actions",
    other: "Other",
  };

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
    const selected = list?.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (filteredCommands.length === 0) {
    return null;
  }

  let globalIndex = 0;

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label="Slash commands"
      className={cn(
        "absolute bottom-full left-0 right-0 mb-2",
        "max-h-[320px] overflow-auto rounded-xl",
        "bg-card border border-border/50",
        "shadow-[0_8px_32px_rgba(0,0,0,0.08)]",
        "dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
        "p-1"
      )}
    >
      {categoryOrder.map((category) => {
        const commands = groupedCommands[category];
        if (!commands || commands.length === 0) return null;

        return (
          <div key={category}>
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {categoryLabels[category]}
            </div>
            {commands.map((cmd) => {
              const index = globalIndex++;
              const isSelected = index === selectedIndex;
              const Icon = cmd.icon;

              return (
                <button
                  key={cmd.id}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => onSelect(cmd.command)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 rounded-lg",
                    "text-left transition-colors duration-100",
                    isSelected
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg",
                    isSelected ? "bg-primary/10 text-primary" : "bg-muted/50"
                  )}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{cmd.label}</div>
                    <div className="text-xs text-muted-foreground/70 truncate">
                      {cmd.description}
                    </div>
                  </div>
                  <code className="text-[10px] text-muted-foreground/50 bg-muted/30 px-1.5 py-0.5 rounded">
                    {cmd.command}
                  </code>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
