"use client";

import { PageShell, KpiCard, EmptyState } from "@/components/honeycomb/page-shell";
import { Megaphone, Plus, Activity } from "lucide-react";
import { useDashboard, useCampaigns } from "@/lib/honeycomb/hooks";

export default function HoneycombDashboardPage() {
  const { data: dashboardData, loading: dashboardLoading } = useDashboard();
  const { data: campaignsData, loading: campaignsLoading } = useCampaigns();

  const kpis = dashboardData?.kpis;
  const campaigns = campaignsData?.campaigns ?? [];

  return (
    <PageShell
      title="Dashboard"
      subtitle="Overview of your marketing performance"
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard 
          label="Active Campaigns" 
          value={kpis?.activeCampaigns ?? undefined}
          loading={dashboardLoading}
        />
        <KpiCard 
          label="Total Impressions" 
          value={kpis?.totalImpressions ?? undefined}
          loading={dashboardLoading}
        />
        <KpiCard 
          label="Click-Through Rate" 
          value={kpis?.clickThroughRate ? `${kpis.clickThroughRate}%` : undefined}
          loading={dashboardLoading}
        />
        <KpiCard 
          label="Total Spend" 
          value={kpis?.totalSpend ? `$${kpis.totalSpend.toLocaleString()}` : undefined}
          loading={dashboardLoading}
        />
      </div>

      {/* Performance Chart Placeholder */}
      <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-white">Performance Overview</h2>
          <select className="bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-sm text-neutral-300">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
        </div>
        <div className="h-64 flex items-center justify-center border border-dashed border-[#2a2a2a] rounded-lg">
          <div className="text-center">
            <Activity className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
            <p className="text-sm text-neutral-500">Connect integrations to view performance data</p>
          </div>
        </div>
      </div>

      {/* Recent Campaigns */}
      <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
          <h2 className="text-lg font-medium text-white">Recent Campaigns</h2>
        </div>
        {campaignsLoading ? (
          <div className="p-8 flex justify-center">
            <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No campaigns yet"
            description="Create your first campaign to start reaching your audience."
            ctaLabel="Create Campaign"
            ctaIcon={Plus}
          />
        ) : (
          <div className="divide-y divide-[#1f1f1f]">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{campaign.name}</p>
                  <p className="text-sm text-neutral-400">{campaign.status}</p>
                </div>
                <div className="text-right">
                  <p className="text-white">{campaign.impressions.toLocaleString()} impressions</p>
                  <p className="text-sm text-neutral-400">{campaign.impressions > 0 ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2) : 0}% CTR</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
