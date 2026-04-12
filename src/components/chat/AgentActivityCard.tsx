"use client";

import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import {
  Search,
  MessageSquare,
  BarChart3,
  Globe,
  CheckCircle,
  Loader2,
  XCircle,
  type LucideIcon,
} from "lucide-react";

// ============================================================================
// Agent Activity Card (Phase 3)
// Shows which specialist agents are working when Tara delegates.
// Minimal design following Colony's design system.
// ============================================================================

export type AgentThreadStatus = "started" | "completed" | "failed";

export interface AgentThread {
  id: string;
  agentName: string;
  label: string;
  status: AgentThreadStatus;
}

interface AgentActivityCardProps {
  threads: AgentThread[];
}

const AGENT_ICONS: Record<string, LucideIcon> = {
  "Deal Agent": Search,
  "Comms Agent": MessageSquare,
  "Honeycomb Agent": BarChart3,
  "Research Agent": Globe,
};

const STATUS_CONFIG: Record<
  AgentThreadStatus,
  { icon: LucideIcon; className: string }
> = {
  started: { icon: Loader2, className: "animate-spin" },
  completed: { icon: CheckCircle, className: "" },
  failed: { icon: XCircle, className: "" },
};

export function AgentActivityCard({ threads }: AgentActivityCardProps) {
  const { theme } = useColonyTheme();

  if (threads.length === 0) return null;

  return (
    <div
      className="rounded-lg border px-3 py-2 space-y-1.5 text-sm"
      style={{
        backgroundColor: theme.surface,
        borderColor: withAlpha(theme.accent, 0.15),
      }}
    >
      {threads.map((thread) => {
        const AgentIcon = AGENT_ICONS[thread.agentName] ?? Search;
        const statusConfig = STATUS_CONFIG[thread.status];
        const StatusIcon = statusConfig.icon;

        return (
          <div
            key={thread.id}
            className="flex items-center gap-2"
            style={{
              color:
                thread.status === "completed"
                  ? theme.textMuted
                  : thread.status === "started"
                    ? theme.accent
                    : "#ef4444",
            }}
          >
            <StatusIcon
              className={`h-3.5 w-3.5 shrink-0 ${statusConfig.className}`}
            />
            <AgentIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />
            <span
              className={
                thread.status === "completed"
                  ? "line-through opacity-60"
                  : ""
              }
            >
              {thread.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
