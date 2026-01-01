"use client";

import { PageShell, KpiCard, DataTableShell } from "@/components/honeycomb/page-shell";
import { Globe, Plus, Link2 } from "lucide-react";
import { usePublishers } from "@/lib/honeycomb/hooks";

export default function PublishersPage() {
  const { data, loading } = usePublishers();
  const publishers = data?.publishers ?? [];
  const placements = data?.placements ?? [];

  // Calculate KPIs
  const connectedPublishers = publishers.filter(p => p.status === "connected").length;
  const totalPlacements = placements.length;
  const totalRevenue = placements.reduce((sum, p) => sum + p.revenue, 0);

  return (
    <PageShell
      title="Publishers"
      subtitle="Manage publisher integrations and ad placements"
      ctaLabel="Add Publisher"
      ctaIcon={Plus}
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard 
          label="Connected Publishers" 
          value={publishers.length > 0 ? connectedPublishers : undefined}
          loading={loading}
        />
        <KpiCard 
          label="Total Placements" 
          value={publishers.length > 0 ? totalPlacements : undefined}
          loading={loading}
        />
        <KpiCard 
          label="Fill Rate" 
          loading={loading}
        />
        <KpiCard 
          label="Revenue" 
          value={publishers.length > 0 ? `$${totalRevenue.toLocaleString()}` : undefined}
          loading={loading}
        />
      </div>

      {/* Connected Publishers */}
      <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl overflow-hidden mb-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
          <h2 className="text-lg font-medium text-white">Connected Publishers</h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : publishers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1f1f1f] mb-4">
                <Link2 className="h-7 w-7 text-neutral-500" />
              </div>
              <h3 className="text-base font-medium text-white mb-1">No publishers connected</h3>
              <p className="text-sm text-neutral-400 text-center max-w-sm">
                Connect to ad networks and publishers to distribute your campaigns.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {publishers.map((publisher) => (
                <div key={publisher.id} className="bg-[#1f1f1f] rounded-lg p-4 text-center">
                  <div className="h-12 w-12 mx-auto mb-2 rounded-lg bg-[#2a2a2a] flex items-center justify-center">
                    <Globe className="h-6 w-6 text-neutral-400" />
                  </div>
                  <p className="text-white text-sm font-medium truncate">{publisher.name}</p>
                  <p className="text-neutral-400 text-xs capitalize">{publisher.status}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Placements Table */}
      {loading ? (
        <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl p-8 flex justify-center">
          <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : placements.length === 0 ? (
        <DataTableShell
          columns={["Placement", "Publisher", "Format", "Impressions", "Clicks", "Revenue"]}
          emptyIcon={Globe}
          emptyTitle="No placements yet"
          emptyDescription="Connect a publisher to start managing ad placements."
          ctaLabel="Add Publisher"
          ctaIcon={Plus}
        />
      ) : (
        <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl overflow-hidden">
          <div className="border-b border-[#1f1f1f]">
            <div className="grid grid-cols-6 gap-4 px-5 py-3">
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Placement</span>
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Publisher</span>
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Format</span>
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Impressions</span>
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Clicks</span>
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Revenue</span>
            </div>
          </div>
          <div className="divide-y divide-[#1f1f1f]">
            {placements.map((placement) => (
              <div key={placement.id} className="grid grid-cols-6 gap-4 px-5 py-4">
                <span className="text-white">{placement.name}</span>
                <span className="text-neutral-400">{placement.publisherName}</span>
                <span className="text-neutral-400">{placement.format}</span>
                <span className="text-white">{placement.impressions.toLocaleString()}</span>
                <span className="text-white">{placement.clicks.toLocaleString()}</span>
                <span className="text-white">${placement.revenue.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}
