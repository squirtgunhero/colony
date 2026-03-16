"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import {
  Mail,
  Plus,
  Send,
  Clock,
  CheckCircle,
  Pause,
  FileText,
  Users,
  Eye,
  MousePointer,
  Loader2,
  MoreVertical,
  Trash2,
} from "lucide-react";

interface EmailCampaign {
  id: string;
  name: string;
  type: string;
  status: string;
  subject: string | null;
  recipientCount: number;
  openCount: number;
  clickCount: number;
  bounceCount: number;
  scheduledAt: Date | string | null;
  sentAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  _count: { steps: number };
}

interface EmailCampaignsListProps {
  campaigns: EmailCampaign[];
  contactCount: number;
}

const typeLabels: Record<string, string> = {
  one_time: "One-time",
  drip: "Drip Sequence",
  newsletter: "Newsletter",
  listing_alert: "Listing Alert",
};

function getStatusIcon(status: string) {
  switch (status) {
    case "active":
      return Send;
    case "scheduled":
      return Clock;
    case "completed":
      return CheckCircle;
    case "paused":
      return Pause;
    default:
      return FileText;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "active":
      return "#22c55e";
    case "scheduled":
      return "#3b82f6";
    case "completed":
      return "#8b5cf6";
    case "paused":
      return "#eab308";
    default:
      return "#94a3b8";
  }
}

export function EmailCampaignsList({
  campaigns,
  contactCount,
}: EmailCampaignsListProps) {
  const { theme } = useColonyTheme();
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [creating, setCreating] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const filtered = campaigns.filter((c) => {
    if (filter === "all") return true;
    return c.status === filter;
  });

  const totalSent = campaigns.reduce((sum, c) => sum + c.recipientCount, 0);
  const totalOpens = campaigns.reduce((sum, c) => sum + c.openCount, 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + c.clickCount, 0);
  const avgOpenRate =
    totalSent > 0 ? ((totalOpens / totalSent) * 100).toFixed(1) : "0";
  const avgClickRate =
    totalSent > 0 ? ((totalClicks / totalSent) * 100).toFixed(1) : "0";

  const stats = [
    { label: "Total Campaigns", value: campaigns.length.toString(), icon: Mail, color: theme.accent },
    { label: "Contacts", value: contactCount.toString(), icon: Users, color: "#3b82f6" },
    { label: "Avg Open Rate", value: `${avgOpenRate}%`, icon: Eye, color: "#22c55e" },
    { label: "Avg Click Rate", value: `${avgClickRate}%`, icon: MousePointer, color: "#8b5cf6" },
  ];

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/marketing/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Untitled Campaign",
          type: "one_time",
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      const data = await res.json();
      router.push(`/marketing/email/${data.campaign.id}`);
    } catch (error) {
      console.error("Create email campaign error:", error);
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    setMenuOpen(null);
    try {
      await fetch(`/api/marketing/email/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (error) {
      console.error("Delete error:", error);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-2xl font-light"
            style={{ fontFamily: "var(--font-spectral), Georgia, serif" }}
          >
            Email Marketing
          </h1>
          <p className="text-sm mt-1" style={{ color: theme.textMuted }}>
            Create and manage email campaigns for your contacts
          </p>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          style={{ backgroundColor: theme.accent, color: "#fff" }}
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          New Email Campaign
        </button>
      </div>

      {/* Stats */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-4"
              style={{
                backgroundColor: withAlpha(theme.text, 0.03),
                border: `1px solid ${withAlpha(theme.text, 0.06)}`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                <span className="text-xs" style={{ color: theme.textMuted }}>
                  {stat.label}
                </span>
              </div>
              <p className="text-xl font-semibold" style={{ color: theme.text }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      {campaigns.length > 0 && (
        <div className="flex gap-1 mb-6">
          {["all", "draft", "scheduled", "active", "completed"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
              style={{
                backgroundColor:
                  filter === tab ? withAlpha(theme.accent, 0.15) : "transparent",
                color: filter === tab ? theme.accent : theme.textMuted,
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {campaigns.length === 0 && (
        <div
          className="rounded-xl p-12 text-center"
          style={{
            backgroundColor: withAlpha(theme.text, 0.03),
            border: `1px solid ${withAlpha(theme.text, 0.06)}`,
          }}
        >
          <Mail
            className="h-12 w-12 mx-auto mb-4"
            style={{ color: theme.textMuted, opacity: 0.5 }}
          />
          <h2 className="text-lg font-medium mb-2" style={{ color: theme.text }}>
            Start Email Marketing
          </h2>
          <p
            className="text-sm mb-6 max-w-md mx-auto"
            style={{ color: theme.textMuted }}
          >
            Create targeted email campaigns for your contacts. Use AI to generate
            compelling content for listings, market updates, and newsletters.
          </p>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: theme.accent, color: "#fff" }}
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Create Your First Campaign
          </button>
        </div>
      )}

      {/* Campaign Cards */}
      {filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((campaign) => {
            const StatusIcon = getStatusIcon(campaign.status);
            const statusColor = getStatusColor(campaign.status);
            const openRate =
              campaign.recipientCount > 0
                ? ((campaign.openCount / campaign.recipientCount) * 100).toFixed(1)
                : "—";
            const clickRate =
              campaign.recipientCount > 0
                ? ((campaign.clickCount / campaign.recipientCount) * 100).toFixed(1)
                : "—";

            return (
              <div
                key={campaign.id}
                className="rounded-xl p-5 transition-all hover:scale-[1.005] cursor-pointer relative"
                style={{
                  backgroundColor: withAlpha(theme.text, 0.03),
                  border: `1px solid ${withAlpha(theme.text, 0.06)}`,
                }}
                onClick={() => router.push(`/marketing/email/${campaign.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center h-9 w-9 rounded-lg"
                      style={{ backgroundColor: withAlpha(statusColor, 0.1) }}
                    >
                      <StatusIcon className="h-4 w-4" style={{ color: statusColor }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium" style={{ color: theme.text }}>
                        {campaign.name}
                      </h3>
                      <p className="text-xs" style={{ color: theme.textMuted }}>
                        {typeLabels[campaign.type] || campaign.type}
                        {campaign.subject && ` · "${campaign.subject}"`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize"
                      style={{
                        backgroundColor: withAlpha(statusColor, 0.15),
                        color: statusColor,
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: statusColor }}
                      />
                      {campaign.status}
                    </span>

                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(menuOpen === campaign.id ? null : campaign.id);
                        }}
                        className="p-1.5 rounded-lg transition-colors hover:opacity-70"
                        style={{ color: theme.textMuted }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {menuOpen === campaign.id && (
                        <div
                          className="absolute right-0 top-8 z-10 w-36 rounded-lg py-1 shadow-lg"
                          style={{
                            backgroundColor: theme.bg,
                            border: `1px solid ${withAlpha(theme.text, 0.1)}`,
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(campaign.id);
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left hover:opacity-70"
                            style={{ color: "#ef4444" }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: theme.textMuted }}>
                      Recipients
                    </p>
                    <p className="text-sm font-medium" style={{ color: theme.text }}>
                      {campaign.recipientCount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: theme.textMuted }}>
                      Open Rate
                    </p>
                    <p className="text-sm font-medium" style={{ color: theme.text }}>
                      {openRate === "—" ? openRate : `${openRate}%`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: theme.textMuted }}>
                      Click Rate
                    </p>
                    <p className="text-sm font-medium" style={{ color: theme.text }}>
                      {clickRate === "—" ? clickRate : `${clickRate}%`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: theme.textMuted }}>
                      {campaign.type === "drip" ? "Steps" : "Bounced"}
                    </p>
                    <p className="text-sm font-medium" style={{ color: theme.text }}>
                      {campaign.type === "drip"
                        ? campaign._count.steps
                        : campaign.bounceCount}
                    </p>
                  </div>
                </div>

                {/* Scheduled / Sent info */}
                {(campaign.scheduledAt || campaign.sentAt) && (
                  <p className="text-xs mt-3" style={{ color: theme.textMuted }}>
                    {campaign.sentAt
                      ? `Sent ${new Date(campaign.sentAt).toLocaleDateString()}`
                      : `Scheduled for ${new Date(campaign.scheduledAt!).toLocaleDateString()}`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
