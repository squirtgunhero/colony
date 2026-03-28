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
  Zap,
  Pause,
  Play,
  Eye,
  BotMessageSquare,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionButton } from "@/components/ui/action-button";

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
  active: "#30d158",
  paused: "#ff9f0a",
  qualified: "#64d2ff",
  converted: "#bf5af2",
  unresponsive: "#98989d",
  opted_out: "#ff453a",
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

  const filters: FilterStatus[] = ["all", "active", "qualified", "converted", "unresponsive", "paused"];

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="AI Lead Engagement"
        subtitle="Tara autonomously nurtures and qualifies your leads 24/7"
        icon={BotMessageSquare}
        actions={
          <ActionButton
            label="Engage Leads"
            icon={Sparkles}
            onClick={() => window.location.href = "/browse/contacts"}
          />
        }
      />

      <StatGrid columns={4}>
        <StatCard label="Active" value={stats.active} icon={Zap} color="#30d158" />
        <StatCard label="Qualified" value={stats.qualified} icon={UserCheck} color="#64d2ff" />
        <StatCard label="Converted" value={stats.converted} icon={TrendingUp} color="#bf5af2" />
        <StatCard label="Messages Sent" value={stats.totalMessages} icon={MessageCircle} />
      </StatGrid>

      {/* Segmented filter */}
      <div
        className="inline-flex rounded-xl p-1"
        style={{ backgroundColor: withAlpha(theme.text, 0.05) }}
      >
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3.5 py-1.5 text-[12px] font-medium capitalize rounded-lg transition-all duration-200"
            style={{
              backgroundColor: filter === f ? withAlpha(theme.text, 0.1) : "transparent",
              color: filter === f ? theme.text : withAlpha(theme.text, 0.4),
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Engagement list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={filter === "all" ? "No AI engagements yet" : `No ${filter} engagements`}
          description="Start by selecting leads from your People page and enabling AI engagement."
          action={
            filter === "all" ? (
              <ActionButton
                label="Engage Leads"
                icon={Sparkles}
                variant="secondary"
                onClick={() => window.location.href = "/browse/contacts"}
              />
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-1.5">
          {filtered.map((eng) => {
            const lastMsg = eng.messages[0];
            const hasReplied = !!eng.lastReplyAt;
            return (
              <div
                key={eng.id}
                className="rounded-2xl p-4 transition-colors"
                style={{ backgroundColor: withAlpha(theme.text, 0.02) }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = withAlpha(theme.text, 0.04)}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = withAlpha(theme.text, 0.02)}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                    style={{
                      backgroundColor: withAlpha(theme.text, 0.08),
                      color: withAlpha(theme.text, 0.5),
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
                          backgroundColor: withAlpha(statusColors[eng.status] || "#98989d", 0.12),
                          color: statusColors[eng.status] || "#98989d",
                        }}
                      >
                        {statusLabels[eng.status] || eng.status}
                      </span>
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: withAlpha(theme.text, 0.05),
                          color: withAlpha(theme.text, 0.45),
                        }}
                      >
                        {objectiveLabels[eng.aiObjective] || eng.aiObjective}
                      </span>
                      {hasReplied && (
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: withAlpha("#30d158", 0.12), color: "#30d158" }}
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

                    {lastMsg && (
                      <p
                        className="text-[12px] mt-2 line-clamp-1"
                        style={{ color: withAlpha(theme.text, 0.45) }}
                      >
                        {lastMsg.role === "assistant" ? "Tara: " : `${eng.contact.name.split(" ")[0]}: `}
                        {lastMsg.content}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {eng.status === "active" ? (
                      <button
                        onClick={() => handleStatusChange(eng.id, "paused")}
                        className="h-8 w-8 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
                        style={{ color: withAlpha(theme.text, 0.3) }}
                        title="Pause"
                        disabled={isPending && actioningId === eng.id}
                      >
                        <Pause className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                    ) : eng.status === "paused" ? (
                      <button
                        onClick={() => handleStatusChange(eng.id, "active")}
                        className="h-8 w-8 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
                        style={{ color: "#30d158" }}
                        title="Resume"
                        disabled={isPending && actioningId === eng.id}
                      >
                        <Play className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                    ) : null}
                    <Link
                      href={`/browse/ai-engage/${eng.id}`}
                      className="h-8 w-8 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
                      style={{ color: withAlpha(theme.text, 0.3) }}
                      title="View conversation"
                    >
                      <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
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
