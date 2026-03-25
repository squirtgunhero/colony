"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import {
  Sparkles,
  MessageCircle,
  UserCheck,
  TrendingUp,
  UserX,
  Zap,
  Pause,
  Play,
  Eye,
  MoreHorizontal,
} from "lucide-react";

interface Engagement {
  id: string;
  contactId: string;
  channel: string;
  status: string;
  aiObjective: string;
  messageCount: number;
  lastMessageAt: string | null;
  lastReplyAt: string | null;
  summary: string | null;
  nextFollowUp: string | null;
  createdAt: string;
  contact: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    source: string | null;
    type: string;
  };
  messages: { id: string; role: string; content: string; createdAt: string }[];
}

interface Stats {
  active: number;
  qualified: number;
  converted: number;
  unresponsive: number;
  totalMessages: number;
}

interface Props {
  engagements: Engagement[];
  stats: Stats;
}

const statusColors: Record<string, string> = {
  active: "#22c55e",
  paused: "#eab308",
  qualified: "#3b82f6",
  converted: "#8b5cf6",
  unresponsive: "#6b7280",
  opted_out: "#ef4444",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  paused: "Paused",
  qualified: "Qualified",
  converted: "Converted",
  unresponsive: "Unresponsive",
  opted_out: "Opted Out",
};

const objectiveLabels: Record<string, string> = {
  qualify: "Qualifying",
  nurture: "Nurturing",
  schedule_showing: "Scheduling",
  re_engage: "Re-engaging",
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

type FilterStatus = "all" | "active" | "qualified" | "converted" | "unresponsive" | "paused";

export function AIEngageDashboard({ engagements, stats }: Props) {
  const { theme } = useColonyTheme();
  const borderColor = withAlpha(theme.text, 0.06);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [isPending, startTransition] = useTransition();
  const [actioningId, setActioningId] = useState<string | null>(null);

  const filtered = filter === "all" ? engagements : engagements.filter((e) => e.status === filter);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setActioningId(id);
    startTransition(async () => {
      await fetch(`/api/ai-engage/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      window.location.reload();
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-[22px] font-semibold"
            style={{ fontFamily: "'Spectral', serif", color: theme.text }}
          >
            AI Lead Engagement
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: withAlpha(theme.text, 0.4) }}>
            Tara autonomously nurtures and qualifies your leads 24/7
          </p>
        </div>
        <Link
          href="/browse/contacts"
          className="flex items-center gap-2 h-9 px-4 rounded-lg text-[13px] font-medium transition-colors"
          style={{ backgroundColor: theme.accent, color: theme.bg }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Engage Leads
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Active", value: stats.active, icon: Zap, color: "#22c55e" },
          { label: "Qualified", value: stats.qualified, icon: UserCheck, color: "#3b82f6" },
          { label: "Converted", value: stats.converted, icon: TrendingUp, color: "#8b5cf6" },
          { label: "Unresponsive", value: stats.unresponsive, icon: UserX, color: "#6b7280" },
          { label: "Messages Sent", value: stats.totalMessages, icon: MessageCircle, color: theme.accent },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-3.5"
            style={{ backgroundColor: withAlpha(theme.text, 0.03), border: `1px solid ${borderColor}` }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <stat.icon className="h-3.5 w-3.5" style={{ color: stat.color }} />
              <span className="text-[10px] uppercase tracking-wider" style={{ color: withAlpha(theme.text, 0.35) }}>
                {stat.label}
              </span>
            </div>
            <p className="text-[22px] font-semibold" style={{ color: theme.text }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1" style={{ borderBottom: `1px solid ${borderColor}` }}>
        {(["all", "active", "qualified", "converted", "unresponsive", "paused"] as FilterStatus[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-2 text-[12px] font-medium capitalize relative transition-colors"
            style={{
              color: filter === f ? theme.accent : withAlpha(theme.text, 0.4),
            }}
          >
            {f}
            {filter === f && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ backgroundColor: theme.accent }} />
            )}
          </button>
        ))}
      </div>

      {/* Engagement list */}
      {filtered.length === 0 ? (
        <div
          className="rounded-xl p-10 text-center"
          style={{ backgroundColor: withAlpha(theme.text, 0.02), border: `1px solid ${borderColor}` }}
        >
          <Sparkles className="h-8 w-8 mx-auto mb-3" style={{ color: withAlpha(theme.text, 0.2) }} />
          <p className="text-[14px] font-medium mb-1" style={{ color: theme.text }}>
            {filter === "all" ? "No AI engagements yet" : `No ${filter} engagements`}
          </p>
          <p className="text-[12px]" style={{ color: withAlpha(theme.text, 0.4) }}>
            Start by selecting leads from your People page and enabling AI engagement
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((eng) => {
            const lastMsg = eng.messages[0];
            const hasReplied = !!eng.lastReplyAt;
            return (
              <div
                key={eng.id}
                className="rounded-xl p-4 transition-colors hover:bg-white/[0.02]"
                style={{ border: `1px solid ${borderColor}` }}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${withAlpha(theme.accent, 0.2)}, ${withAlpha(theme.accent, 0.08)})`,
                      color: theme.accent,
                    }}
                  >
                    {eng.contact.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/browse/contacts/${eng.contact.id}`}
                        className="text-[14px] font-medium hover:underline"
                        style={{ color: theme.text }}
                      >
                        {eng.contact.name}
                      </Link>
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: withAlpha(statusColors[eng.status] || "#6b7280", 0.15),
                          color: statusColors[eng.status] || "#6b7280",
                        }}
                      >
                        {statusLabels[eng.status] || eng.status}
                      </span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: withAlpha(theme.text, 0.06),
                          color: withAlpha(theme.text, 0.5),
                        }}
                      >
                        {objectiveLabels[eng.aiObjective] || eng.aiObjective}
                      </span>
                      {hasReplied && (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: withAlpha("#22c55e", 0.15), color: "#22c55e" }}
                        >
                          Responded
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-[12px]" style={{ color: withAlpha(theme.text, 0.4) }}>
                      <span>{eng.channel.toUpperCase()}</span>
                      <span>{eng.messageCount} messages</span>
                      {eng.contact.source && <span>via {eng.contact.source.replace(/_/g, " ")}</span>}
                      {eng.lastMessageAt && <span>{timeAgo(eng.lastMessageAt)}</span>}
                    </div>

                    {/* Last message preview */}
                    {lastMsg && (
                      <p
                        className="text-[12px] mt-2 line-clamp-1"
                        style={{ color: withAlpha(theme.text, 0.5) }}
                      >
                        {lastMsg.role === "assistant" ? "Tara: " : `${eng.contact.name.split(" ")[0]}: `}
                        {lastMsg.content}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {eng.status === "active" ? (
                      <button
                        onClick={() => handleStatusChange(eng.id, "paused")}
                        className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors"
                        style={{ color: withAlpha(theme.text, 0.3) }}
                        title="Pause"
                        disabled={isPending && actioningId === eng.id}
                      >
                        <Pause className="h-3.5 w-3.5" />
                      </button>
                    ) : eng.status === "paused" ? (
                      <button
                        onClick={() => handleStatusChange(eng.id, "active")}
                        className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors"
                        style={{ color: "#22c55e" }}
                        title="Resume"
                        disabled={isPending && actioningId === eng.id}
                      >
                        <Play className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                    <Link
                      href={`/browse/ai-engage/${eng.id}`}
                      className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors"
                      style={{ color: withAlpha(theme.text, 0.3) }}
                      title="View conversation"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
