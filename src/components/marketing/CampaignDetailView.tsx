"use client";

import Link from "next/link";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import {
  ArrowLeft,
  Eye,
  MousePointer,
  DollarSign,
  Users,
  TrendingUp,
  Facebook,
  ExternalLink,
} from "lucide-react";

interface Ad {
  id: string;
  name: string;
  status: string;
  effectiveStatus: string | null;
  previewUrl: string | null;
}

interface AdSet {
  id: string;
  name: string;
  status: string;
  effectiveStatus: string | null;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  ads: Ad[];
}

interface Campaign {
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
  startTime: Date | null;
  stopTime: Date | null;
  adAccount: { adAccountName: string | null };
  adSets: AdSet[];
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

export function CampaignDetailView({ campaign }: { campaign: Campaign }) {
  const { theme } = useColonyTheme();

  const ctr =
    campaign.impressions > 0
      ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2)
      : "0.00";

  const cpc =
    campaign.clicks > 0 ? (campaign.spend / 100 / campaign.clicks).toFixed(2) : "—";

  const metrics = [
    { label: "Spend", value: formatCurrency(campaign.spend), icon: DollarSign, color: theme.accent },
    { label: "Impressions", value: formatNumber(campaign.impressions), icon: Eye, color: "#3b82f6" },
    { label: "Clicks", value: formatNumber(campaign.clicks), icon: MousePointer, color: "#10b981" },
    { label: "CTR", value: `${ctr}%`, icon: TrendingUp, color: "#8b5cf6" },
    { label: "Reach", value: formatNumber(campaign.reach), icon: Users, color: "#f59e0b" },
    { label: "CPC", value: cpc === "—" ? cpc : `$${cpc}`, icon: DollarSign, color: "#ef4444" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Back Link */}
      <Link
        href="/marketing/campaigns"
        className="inline-flex items-center gap-2 text-sm mb-6 transition-opacity hover:opacity-70"
        style={{ color: theme.textMuted }}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Campaigns
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div
            className="flex items-center justify-center h-12 w-12 rounded-xl"
            style={{ backgroundColor: withAlpha(theme.accent, 0.1) }}
          >
            <Facebook className="h-6 w-6" style={{ color: theme.accent }} />
          </div>
          <div>
            <h1
              className="text-2xl font-light"
              style={{ fontFamily: "var(--font-spectral), Georgia, serif" }}
            >
              {campaign.name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs" style={{ color: theme.textMuted }}>
                {formatObjective(campaign.objective)}
              </span>
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: withAlpha(
                    getStatusColor(campaign.effectiveStatus || campaign.status),
                    0.15
                  ),
                  color: getStatusColor(campaign.effectiveStatus || campaign.status),
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
                {(campaign.effectiveStatus || campaign.status).toLowerCase()}
              </span>
              {campaign.adAccount.adAccountName && (
                <span className="text-xs" style={{ color: theme.textMuted }}>
                  {campaign.adAccount.adAccountName}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Budget */}
      {(campaign.dailyBudget || campaign.lifetimeBudget) && (
        <p className="text-sm mb-6" style={{ color: theme.textMuted }}>
          Budget:{" "}
          {campaign.dailyBudget
            ? `${formatCurrency(campaign.dailyBudget)}/day`
            : `${formatCurrency(campaign.lifetimeBudget!)} lifetime`}
          {campaign.startTime && (
            <>
              {" "}&middot; Started{" "}
              {new Date(campaign.startTime).toLocaleDateString()}
            </>
          )}
        </p>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-xl p-4"
            style={{
              backgroundColor: withAlpha(theme.text, 0.03),
              border: `1px solid ${withAlpha(theme.text, 0.06)}`,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <m.icon className="h-3.5 w-3.5" style={{ color: m.color }} />
              <span className="text-xs" style={{ color: theme.textMuted }}>
                {m.label}
              </span>
            </div>
            <p className="text-lg font-semibold" style={{ color: theme.text }}>
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* Ad Sets */}
      <h2
        className="text-lg font-light mb-4"
        style={{ fontFamily: "var(--font-spectral), Georgia, serif" }}
      >
        Ad Sets ({campaign.adSets.length})
      </h2>

      {campaign.adSets.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{
            backgroundColor: withAlpha(theme.text, 0.03),
            border: `1px solid ${withAlpha(theme.text, 0.06)}`,
          }}
        >
          <p className="text-sm" style={{ color: theme.textMuted }}>
            No ad sets found for this campaign.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaign.adSets.map((adSet) => (
            <div
              key={adSet.id}
              className="rounded-xl p-5"
              style={{
                backgroundColor: withAlpha(theme.text, 0.03),
                border: `1px solid ${withAlpha(theme.text, 0.06)}`,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-medium" style={{ color: theme.text }}>
                    {adSet.name}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
                    {adSet.ads.length} ad{adSet.ads.length !== 1 ? "s" : ""}
                    {adSet.dailyBudget
                      ? ` · ${formatCurrency(adSet.dailyBudget)}/day`
                      : adSet.lifetimeBudget
                        ? ` · ${formatCurrency(adSet.lifetimeBudget)} lifetime`
                        : ""}
                  </p>
                </div>
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: withAlpha(
                      getStatusColor(adSet.effectiveStatus || adSet.status),
                      0.15
                    ),
                    color: getStatusColor(adSet.effectiveStatus || adSet.status),
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: getStatusColor(
                        adSet.effectiveStatus || adSet.status
                      ),
                    }}
                  />
                  {(adSet.effectiveStatus || adSet.status).toLowerCase()}
                </span>
              </div>

              {/* Ads within this ad set */}
              {adSet.ads.length > 0 && (
                <div className="space-y-2 mt-3 pt-3" style={{ borderTop: `1px solid ${withAlpha(theme.text, 0.06)}` }}>
                  {adSet.ads.map((ad) => (
                    <div
                      key={ad.id}
                      className="flex items-center justify-between py-1.5"
                    >
                      <span className="text-xs" style={{ color: theme.text }}>
                        {ad.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: withAlpha(
                              getStatusColor(ad.effectiveStatus || ad.status),
                              0.15
                            ),
                            color: getStatusColor(ad.effectiveStatus || ad.status),
                          }}
                        >
                          {(ad.effectiveStatus || ad.status).toLowerCase()}
                        </span>
                        {ad.previewUrl && (
                          <a
                            href={ad.previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs flex items-center gap-1 hover:opacity-70"
                            style={{ color: theme.accent }}
                          >
                            <ExternalLink className="h-3 w-3" />
                            Preview
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
