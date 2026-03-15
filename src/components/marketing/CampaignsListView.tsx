"use client";

import { useState } from "react";
import Link from "next/link";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import {
  Megaphone,
  TrendingUp,
  Eye,
  MousePointer,
  DollarSign,
  Users,
  Plus,
  ExternalLink,
  Facebook,
} from "lucide-react";

interface MetaCampaign {
  id: string;
  name: string;
  objective: string | null;
  status: string;
  effectiveStatus: string | null;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  impressions: number;
  clicks: number;
  spend: number;
  reach: number;
  conversions: number;
  startTime: Date | string | null;
  stopTime: Date | string | null;
  updatedAt: Date | string;
  adAccount: { adAccountName: string | null };
  _count: { adSets: number };
}

interface CampaignsListViewProps {
  metaCampaigns: MetaCampaign[];
  hasMetaAccount: boolean;
}

function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}K`;
  return `$${dollars.toFixed(2)}`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function getStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case "ACTIVE":
      return "#22c55e";
    case "PAUSED":
      return "#eab308";
    case "ARCHIVED":
    case "DELETED":
      return "#6b7280";
    default:
      return "#94a3b8";
  }
}

function formatObjective(obj: string | null): string {
  if (!obj) return "General";
  return obj
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CampaignsListView({
  metaCampaigns,
  hasMetaAccount,
}: CampaignsListViewProps) {
  const { theme } = useColonyTheme();
  const [filter, setFilter] = useState<"all" | "active" | "paused">("all");

  const filtered = metaCampaigns.filter((c) => {
    if (filter === "all") return true;
    return c.status.toUpperCase() === filter.toUpperCase();
  });

  // Aggregate stats
  const totalSpend = metaCampaigns.reduce((sum, c) => sum + c.spend, 0);
  const totalImpressions = metaCampaigns.reduce((sum, c) => sum + c.impressions, 0);
  const totalClicks = metaCampaigns.reduce((sum, c) => sum + c.clicks, 0);
  const totalReach = metaCampaigns.reduce((sum, c) => sum + c.reach, 0);
  const activeCampaigns = metaCampaigns.filter(
    (c) => c.status.toUpperCase() === "ACTIVE"
  ).length;

  const stats = [
    {
      label: "Active Campaigns",
      value: activeCampaigns.toString(),
      icon: Megaphone,
      color: "#22c55e",
    },
    {
      label: "Total Spend",
      value: formatCurrency(totalSpend),
      icon: DollarSign,
      color: theme.accent,
    },
    {
      label: "Impressions",
      value: formatNumber(totalImpressions),
      icon: Eye,
      color: "#3b82f6",
    },
    {
      label: "Reach",
      value: formatNumber(totalReach),
      icon: Users,
      color: "#8b5cf6",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-2xl font-light"
            style={{ fontFamily: "var(--font-spectral), Georgia, serif" }}
          >
            Campaigns
          </h1>
          <p className="text-sm mt-1" style={{ color: theme.textMuted }}>
            Manage your advertising campaigns across platforms
          </p>
        </div>
        {hasMetaAccount && (
          <Link
            href="/marketing/campaigns/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: theme.accent,
              color: "#fff",
            }}
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </Link>
        )}
      </div>

      {/* Stats Row */}
      {hasMetaAccount && metaCampaigns.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-4 transition-colors"
              style={{
                backgroundColor: withAlpha(theme.text, 0.03),
                border: `1px solid ${withAlpha(theme.text, 0.06)}`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon
                  className="h-4 w-4"
                  style={{ color: stat.color }}
                />
                <span
                  className="text-xs"
                  style={{ color: theme.textMuted }}
                >
                  {stat.label}
                </span>
              </div>
              <p
                className="text-xl font-semibold"
                style={{ color: theme.text }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* No Meta Account State */}
      {!hasMetaAccount && (
        <div
          className="rounded-xl p-12 text-center"
          style={{
            backgroundColor: withAlpha(theme.text, 0.03),
            border: `1px solid ${withAlpha(theme.text, 0.06)}`,
          }}
        >
          <Facebook
            className="h-12 w-12 mx-auto mb-4"
            style={{ color: theme.textMuted, opacity: 0.5 }}
          />
          <h2
            className="text-lg font-medium mb-2"
            style={{ color: theme.text }}
          >
            Connect Your Ad Accounts
          </h2>
          <p
            className="text-sm mb-6 max-w-md mx-auto"
            style={{ color: theme.textMuted }}
          >
            Connect your Facebook Ads account to manage campaigns, track
            performance, and create new ads — all from Colony.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium"
            style={{ backgroundColor: theme.accent, color: "#fff" }}
          >
            <ExternalLink className="h-4 w-4" />
            Connect in Settings
          </Link>
        </div>
      )}

      {/* Filter Tabs */}
      {hasMetaAccount && metaCampaigns.length > 0 && (
        <div className="flex gap-1 mb-6">
          {(["all", "active", "paused"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
              style={{
                backgroundColor:
                  filter === tab
                    ? withAlpha(theme.accent, 0.15)
                    : "transparent",
                color: filter === tab ? theme.accent : theme.textMuted,
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {hasMetaAccount && metaCampaigns.length === 0 && (
        <div
          className="rounded-xl p-12 text-center"
          style={{
            backgroundColor: withAlpha(theme.text, 0.03),
            border: `1px solid ${withAlpha(theme.text, 0.06)}`,
          }}
        >
          <TrendingUp
            className="h-12 w-12 mx-auto mb-4"
            style={{ color: theme.textMuted, opacity: 0.5 }}
          />
          <h2
            className="text-lg font-medium mb-2"
            style={{ color: theme.text }}
          >
            No Campaigns Yet
          </h2>
          <p
            className="text-sm mb-6 max-w-md mx-auto"
            style={{ color: theme.textMuted }}
          >
            Create your first ad campaign or ask Tara to set one up for you.
            Just say &quot;Run a Facebook ad for seller leads&quot; in the chat.
          </p>
          <Link
            href="/marketing/campaigns/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium"
            style={{ backgroundColor: theme.accent, color: "#fff" }}
          >
            <Plus className="h-4 w-4" />
            Create Campaign
          </Link>
        </div>
      )}

      {/* Campaign Cards */}
      {filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((campaign) => {
            const ctr =
              campaign.impressions > 0
                ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2)
                : "0.00";

            return (
              <Link
                key={campaign.id}
                href={`/marketing/campaigns/${campaign.id}`}
                className="block rounded-xl p-5 transition-all hover:scale-[1.005]"
                style={{
                  backgroundColor: withAlpha(theme.text, 0.03),
                  border: `1px solid ${withAlpha(theme.text, 0.06)}`,
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center h-9 w-9 rounded-lg"
                      style={{
                        backgroundColor: withAlpha(theme.accent, 0.1),
                      }}
                    >
                      <Facebook
                        className="h-4 w-4"
                        style={{ color: theme.accent }}
                      />
                    </div>
                    <div>
                      <h3
                        className="text-sm font-medium"
                        style={{ color: theme.text }}
                      >
                        {campaign.name}
                      </h3>
                      <p
                        className="text-xs"
                        style={{ color: theme.textMuted }}
                      >
                        {formatObjective(campaign.objective)} &middot;{" "}
                        {campaign._count.adSets} ad set
                        {campaign._count.adSets !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: withAlpha(
                          getStatusColor(
                            campaign.effectiveStatus || campaign.status
                          ),
                          0.15
                        ),
                        color: getStatusColor(
                          campaign.effectiveStatus || campaign.status
                        ),
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          backgroundColor: getStatusColor(
                            campaign.effectiveStatus || campaign.status
                          ),
                        }}
                      />
                      {(
                        campaign.effectiveStatus || campaign.status
                      ).toLowerCase()}
                    </span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-4">
                  <div>
                    <p
                      className="text-xs mb-0.5"
                      style={{ color: theme.textMuted }}
                    >
                      Spend
                    </p>
                    <p
                      className="text-sm font-medium"
                      style={{ color: theme.text }}
                    >
                      {formatCurrency(campaign.spend)}
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-xs mb-0.5"
                      style={{ color: theme.textMuted }}
                    >
                      Impressions
                    </p>
                    <p
                      className="text-sm font-medium"
                      style={{ color: theme.text }}
                    >
                      {formatNumber(campaign.impressions)}
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-xs mb-0.5"
                      style={{ color: theme.textMuted }}
                    >
                      Clicks
                    </p>
                    <p
                      className="text-sm font-medium"
                      style={{ color: theme.text }}
                    >
                      {formatNumber(campaign.clicks)}
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-xs mb-0.5"
                      style={{ color: theme.textMuted }}
                    >
                      CTR
                    </p>
                    <p
                      className="text-sm font-medium"
                      style={{ color: theme.text }}
                    >
                      {ctr}%
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-xs mb-0.5"
                      style={{ color: theme.textMuted }}
                    >
                      Reach
                    </p>
                    <p
                      className="text-sm font-medium"
                      style={{ color: theme.text }}
                    >
                      {formatNumber(campaign.reach)}
                    </p>
                  </div>
                </div>

                {/* Budget info */}
                {(campaign.dailyBudget || campaign.lifetimeBudget) && (
                  <p
                    className="text-xs mt-3"
                    style={{ color: theme.textMuted }}
                  >
                    Budget:{" "}
                    {campaign.dailyBudget
                      ? `${formatCurrency(campaign.dailyBudget)}/day`
                      : `${formatCurrency(campaign.lifetimeBudget!)} lifetime`}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
