"use client";

// HIDDEN: Phase 2 - /honeycomb removed from main nav; still accessible via URL.

import { useState } from "react";
import { PageShell, KpiCard, EmptyState } from "@/components/honeycomb/page-shell";
import { Megaphone, Plus, Activity, TrendingUp, TrendingDown, RefreshCw, Link2 } from "lucide-react";
import { useDashboard, useCampaigns, useMetaAccounts, useMetaCampaigns, useMetaInsights, useMetaSync } from "@/lib/honeycomb/hooks";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function HoneycombDashboardPage() {
  const [dateRange, setDateRange] = useState<"last_7d" | "last_30d" | "last_90d">("last_30d");
  
  // Existing local data
  const { data: dashboardData, loading: dashboardLoading } = useDashboard();
  const { data: campaignsData, loading: campaignsLoading } = useCampaigns();
  
  // Meta Ads data
  const { data: metaAccountsData, loading: metaAccountsLoading } = useMetaAccounts();
  const { data: metaCampaignsData, loading: metaCampaignsLoading, refetch: refetchMetaCampaigns } = useMetaCampaigns();
  const { data: metaInsightsData, loading: metaInsightsLoading, refetch: refetchMetaInsights } = useMetaInsights({ range: dateRange });
  const { sync, syncing } = useMetaSync();

  const kpis = dashboardData?.kpis;
  const localCampaigns = campaignsData?.campaigns ?? [];
  const metaAccounts = metaAccountsData?.accounts ?? [];
  const metaCampaigns = metaCampaignsData?.campaigns ?? [];
  const metaInsights = metaInsightsData;
  
  const hasMetaConnection = metaAccounts.length > 0;
  const isLoading = dashboardLoading || campaignsLoading || metaAccountsLoading;
  
  // Combine campaigns from both sources
  const allCampaigns = [
    ...metaCampaigns.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status,
      impressions: c.impressions,
      clicks: c.clicks,
      spend: c.spend,
      ctr: parseFloat(c.ctr),
      source: "meta" as const,
    })),
    ...localCampaigns.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status,
      impressions: c.impressions,
      clicks: c.clicks,
      spend: c.spend,
      ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
      source: "local" as const,
    })),
  ];

  // Calculate KPIs from Meta data if available
  const displayKpis = hasMetaConnection && metaInsights ? {
    activeCampaigns: metaCampaigns.filter(c => c.status === "ACTIVE").length,
    totalImpressions: metaInsights.totals.impressions,
    clickThroughRate: parseFloat(metaInsights.averages.ctr),
    totalSpend: parseFloat(metaInsights.totals.spend),
  } : {
    activeCampaigns: kpis?.activeCampaigns ?? 0,
    totalImpressions: kpis?.totalImpressions ?? 0,
    clickThroughRate: kpis?.clickThroughRate ?? 0,
    totalSpend: kpis?.totalSpend ?? 0,
  };

  const handleSync = async () => {
    await sync();
    refetchMetaCampaigns();
    refetchMetaInsights();
  };

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDateRange(e.target.value as "last_7d" | "last_30d" | "last_90d");
  };

  return (
    <PageShell
      title="Dashboard"
      subtitle="Overview of your marketing performance"
      actions={
        hasMetaConnection && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="border-[#2a2a2a] bg-transparent text-neutral-300 hover:bg-[#1f1f1f]"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Data"}
          </Button>
        )
      }
    >
      {/* Connection Banner */}
      {!hasMetaConnection && !metaAccountsLoading && (
        <div className="mb-6 flex items-center justify-between p-4 bg-gradient-to-r from-[#1877F2]/10 to-transparent border border-[#1877F2]/30 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#1877F2] flex items-center justify-center">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </div>
            <div>
              <p className="text-white font-medium">Connect Meta Ads</p>
              <p className="text-sm text-neutral-400">Sync your Facebook & Instagram campaigns for real performance data</p>
            </div>
          </div>
          <Link href="/honeycomb/settings?tab=integrations">
            <Button className="bg-[#1877F2] hover:bg-[#166FE5] text-white">
              <Link2 className="h-4 w-4 mr-2" />
              Connect
            </Button>
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard 
          label="Active Campaigns" 
          value={displayKpis.activeCampaigns}
          loading={isLoading || metaCampaignsLoading}
        />
        <KpiCard 
          label="Total Impressions" 
          value={displayKpis.totalImpressions.toLocaleString()}
          loading={isLoading || metaInsightsLoading}
        />
        <KpiCard 
          label="Click-Through Rate" 
          value={`${displayKpis.clickThroughRate.toFixed(2)}%`}
          loading={isLoading || metaInsightsLoading}
        />
        <KpiCard 
          label="Total Spend" 
          value={`$${displayKpis.totalSpend.toLocaleString()}`}
          loading={isLoading || metaInsightsLoading}
        />
      </div>

      {/* Performance Chart */}
      <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-white">Performance Overview</h2>
          <select 
            value={dateRange}
            onChange={handleDateRangeChange}
            className="bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-sm text-neutral-300"
          >
            <option value="last_7d">Last 7 days</option>
            <option value="last_30d">Last 30 days</option>
            <option value="last_90d">Last 90 days</option>
          </select>
        </div>
        
        {!hasMetaConnection ? (
          <div className="h-64 flex items-center justify-center border border-dashed border-[#2a2a2a] rounded-lg">
            <div className="text-center">
              <Activity className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
              <p className="text-sm text-neutral-500">Connect Meta Ads to view performance data</p>
            </div>
          </div>
        ) : metaInsightsLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : metaInsights?.chartData && metaInsights.chartData.length > 0 ? (
          <div className="space-y-4">
            {/* Simple metrics display */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#0c0c0c] rounded-lg p-4">
                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Reach</p>
                <p className="text-2xl font-semibold text-white">{metaInsights.totals.reach.toLocaleString()}</p>
              </div>
              <div className="bg-[#0c0c0c] rounded-lg p-4">
                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Clicks</p>
                <p className="text-2xl font-semibold text-white">{metaInsights.totals.clicks.toLocaleString()}</p>
              </div>
              <div className="bg-[#0c0c0c] rounded-lg p-4">
                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Avg. CPC</p>
                <p className="text-2xl font-semibold text-white">${metaInsights.averages.cpc}</p>
              </div>
              <div className="bg-[#0c0c0c] rounded-lg p-4">
                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Conversions</p>
                <p className="text-2xl font-semibold text-white">{metaInsights.totals.conversions.toLocaleString()}</p>
              </div>
            </div>
            
            {/* Mini chart representation */}
            <div className="h-32 flex items-end gap-1">
              {metaInsights.chartData.slice(-30).map((day, i) => {
                const maxSpend = Math.max(...metaInsights.chartData.map(d => d.spend), 1);
                const height = (day.spend / maxSpend) * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 bg-amber-500/20 hover:bg-amber-500/40 rounded-t transition-colors"
                    style={{ height: `${Math.max(height, 5)}%` }}
                    title={`${day.date}: $${day.spend.toFixed(2)}`}
                  />
                );
              })}
            </div>
            <p className="text-xs text-neutral-500 text-center">Daily spend over time</p>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center border border-dashed border-[#2a2a2a] rounded-lg">
            <div className="text-center">
              <Activity className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
              <p className="text-sm text-neutral-500">No data available for this period</p>
              <p className="text-xs text-neutral-600 mt-1">Try syncing your data or selecting a different date range</p>
            </div>
          </div>
        )}
      </div>

      {/* Campaigns List */}
      <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
          <h2 className="text-lg font-medium text-white">Campaigns</h2>
          {hasMetaConnection && (
            <span className="text-xs text-neutral-500 bg-[#1f1f1f] px-2 py-1 rounded">
              {metaCampaigns.length} from Meta
            </span>
          )}
        </div>
        
        {(campaignsLoading || metaCampaignsLoading) ? (
          <div className="p-8 flex justify-center">
            <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : allCampaigns.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No campaigns yet"
            description={hasMetaConnection 
              ? "Your synced campaigns will appear here. Try syncing your Meta account."
              : "Connect Meta Ads or create your first campaign to get started."
            }
            ctaLabel={hasMetaConnection ? "Sync Now" : "Connect Meta Ads"}
            ctaIcon={hasMetaConnection ? RefreshCw : Plus}
          />
        ) : (
          <div className="divide-y divide-[#1f1f1f]">
            {allCampaigns.slice(0, 10).map((campaign) => (
              <div key={campaign.id} className="px-6 py-4 flex items-center justify-between hover:bg-[#1a1a1a] transition-colors">
                <div className="flex items-center gap-3">
                  {campaign.source === "meta" && (
                    <div className="h-6 w-6 rounded bg-[#1877F2]/20 flex items-center justify-center">
                      <svg className="h-3 w-3 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </div>
                  )}
                  <div>
                    <p className="text-white font-medium">{campaign.name}</p>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                        campaign.status === "ACTIVE" || campaign.status === "active"
                          ? "bg-green-500/10 text-green-400"
                          : campaign.status === "PAUSED" || campaign.status === "paused"
                          ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-neutral-500/10 text-neutral-400"
                      }`}>
                        {campaign.status}
                      </span>
                      {campaign.source === "meta" && (
                        <span className="text-xs text-neutral-500">Meta Ads</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white">{campaign.impressions.toLocaleString()} impressions</p>
                  <div className="flex items-center justify-end gap-2 text-sm">
                    <span className="text-neutral-400">
                      {campaign.ctr.toFixed(2)}% CTR
                    </span>
                    {campaign.spend > 0 && (
                      <>
                        <span className="text-neutral-600">•</span>
                        <span className="text-amber-400">${campaign.spend.toLocaleString()}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {allCampaigns.length > 10 && (
          <div className="px-6 py-3 border-t border-[#1f1f1f] text-center">
            <Link href="/honeycomb/campaigns" className="text-sm text-amber-500 hover:text-amber-400">
              View all {allCampaigns.length} campaigns →
            </Link>
          </div>
        )}
      </div>
    </PageShell>
  );
}
