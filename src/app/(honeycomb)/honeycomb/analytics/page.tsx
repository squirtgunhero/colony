"use client";

import { PageShell, KpiCard } from "@/components/honeycomb/page-shell";
import { BarChart3, TrendingUp, Activity } from "lucide-react";
import { useAnalytics } from "@/lib/honeycomb/hooks";

export default function AnalyticsPage() {
  const { data, loading } = useAnalytics();
  const summary = data?.summary;

  return (
    <PageShell
      title="Analytics"
      subtitle="Track and analyze your marketing performance"
    >
      {/* Date Range Selector */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-sm bg-amber-500/10 text-amber-500 rounded-lg font-medium">
            Last 7 days
          </button>
          <button className="px-3 py-1.5 text-sm bg-[#161616] text-neutral-400 rounded-lg hover:text-neutral-200">
            Last 30 days
          </button>
          <button className="px-3 py-1.5 text-sm bg-[#161616] text-neutral-400 rounded-lg hover:text-neutral-200">
            Last 90 days
          </button>
          <button className="px-3 py-1.5 text-sm bg-[#161616] text-neutral-400 rounded-lg hover:text-neutral-200">
            Custom
          </button>
        </div>
        <button className="px-4 py-2 text-sm bg-[#161616] border border-[#1f1f1f] text-neutral-300 rounded-lg hover:bg-[#1f1f1f]">
          Export Report
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard 
          label="Total Impressions" 
          value={summary?.totalImpressions ?? undefined}
          loading={loading}
        />
        <KpiCard 
          label="Total Clicks" 
          value={summary?.totalClicks ?? undefined}
          loading={loading}
        />
        <KpiCard 
          label="Conversions" 
          value={summary?.conversions ?? undefined}
          loading={loading}
        />
        <KpiCard 
          label="Cost per Conversion" 
          value={summary?.costPerConversion ? `$${summary.costPerConversion.toFixed(2)}` : undefined}
          loading={loading}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Performance Over Time */}
        <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl p-6">
          <h3 className="text-base font-medium text-white mb-4">Performance Over Time</h3>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : summary?.performanceOverTime && summary.performanceOverTime.length > 0 ? (
            <div className="h-64">
              {/* Chart would go here when data is available */}
              <div className="h-full flex items-center justify-center border border-dashed border-[#2a2a2a] rounded-lg">
                <p className="text-sm text-neutral-500">Chart visualization</p>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center border border-dashed border-[#2a2a2a] rounded-lg">
              <div className="text-center">
                <TrendingUp className="h-8 w-8 text-neutral-600 mx-auto mb-2" />
                <p className="text-sm text-neutral-500">Connect integrations to view data</p>
              </div>
            </div>
          )}
        </div>

        {/* Channel Breakdown */}
        <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl p-6">
          <h3 className="text-base font-medium text-white mb-4">Channel Breakdown</h3>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : summary?.channelBreakdown && summary.channelBreakdown.length > 0 ? (
            <div className="h-64">
              {/* Chart would go here when data is available */}
              <div className="h-full flex items-center justify-center border border-dashed border-[#2a2a2a] rounded-lg">
                <p className="text-sm text-neutral-500">Chart visualization</p>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center border border-dashed border-[#2a2a2a] rounded-lg">
              <div className="text-center">
                <BarChart3 className="h-8 w-8 text-neutral-600 mx-auto mb-2" />
                <p className="text-sm text-neutral-500">Connect integrations to view data</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl p-6 mb-8">
        <h3 className="text-base font-medium text-white mb-4">Conversion Funnel</h3>
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center border border-dashed border-[#2a2a2a] rounded-lg">
            <div className="text-center">
              <Activity className="h-8 w-8 text-neutral-600 mx-auto mb-2" />
              <p className="text-sm text-neutral-500">Connect integrations to view funnel data</p>
            </div>
          </div>
        )}
      </div>

      {/* Top Performing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Campaigns */}
        <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1f1f1f]">
            <h3 className="text-base font-medium text-white">Top Campaigns</h3>
          </div>
          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : summary?.topCampaigns && summary.topCampaigns.length > 0 ? (
            <div className="divide-y divide-[#1f1f1f]">
              {summary.topCampaigns.map((campaign) => (
                <div key={campaign.id} className="px-6 py-3 flex items-center justify-between">
                  <span className="text-white">{campaign.name}</span>
                  <span className="text-neutral-400">{campaign.ctr}% CTR</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-neutral-500">No campaign data available</p>
            </div>
          )}
        </div>

        {/* Top Creatives */}
        <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1f1f1f]">
            <h3 className="text-base font-medium text-white">Top Creatives</h3>
          </div>
          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : summary?.topCreatives && summary.topCreatives.length > 0 ? (
            <div className="divide-y divide-[#1f1f1f]">
              {summary.topCreatives.map((creative) => (
                <div key={creative.id} className="px-6 py-3 flex items-center justify-between">
                  <span className="text-white">{creative.name}</span>
                  <span className="text-neutral-400">{creative.ctr}% CTR</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-neutral-500">No creative data available</p>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
