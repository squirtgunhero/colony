"use client";

import { useState } from "react";
import { PageShell, KpiCard, DataTableShell } from "@/components/honeycomb/page-shell";
import { Megaphone, Plus, X } from "lucide-react";
import { useCampaigns } from "@/lib/honeycomb/hooks";
import { createCampaign } from "@/lib/honeycomb/api";
import { Button } from "@/components/ui/button";

export default function CampaignsPage() {
  const { data, loading, refetch } = useCampaigns();
  const campaigns = data?.campaigns ?? [];
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [objective, setObjective] = useState<string>("");

  // Calculate KPIs from campaigns data
  const activeCampaigns = campaigns.filter(c => c.status === "active").length;
  const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);
  const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);

  const handleCreate = async () => {
    if (!name.trim()) return;
    
    try {
      setCreating(true);
      await createCampaign({
        name: name.trim(),
        description: description.trim() || undefined,
        objective: objective as "awareness" | "traffic" | "engagement" | "leads" | "sales" | undefined,
      });
      setShowCreateDialog(false);
      setName("");
      setDescription("");
      setObjective("");
      await refetch();
    } catch (error) {
      console.error("Failed to create campaign:", error);
    } finally {
      setCreating(false);
    }
  };

  const openDialog = () => setShowCreateDialog(true);

  return (
    <>
      <PageShell
        title="Campaigns"
        subtitle="Manage your marketing campaigns across all channels"
        ctaLabel="Create Campaign"
        ctaIcon={Plus}
        onCtaClick={openDialog}
      >
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard 
            label="Active Campaigns" 
            value={campaigns.length > 0 ? activeCampaigns : undefined}
            loading={loading}
          />
          <KpiCard 
            label="Total Impressions" 
            value={campaigns.length > 0 ? totalImpressions.toLocaleString() : undefined}
            loading={loading}
          />
          <KpiCard 
            label="Conversions" 
            value={campaigns.length > 0 ? totalConversions : undefined}
            loading={loading}
          />
          <KpiCard 
            label="Total Spend" 
            value={campaigns.length > 0 ? `$${totalSpend.toLocaleString()}` : undefined}
            loading={loading}
          />
        </div>

        {/* Campaigns Table */}
        {loading ? (
          <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl p-8 flex justify-center">
            <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          <DataTableShell
            columns={["Campaign", "Status", "Impressions", "Clicks", "Conversions", "Spend"]}
            emptyIcon={Megaphone}
            emptyTitle="No campaigns yet"
            emptyDescription="Create your first campaign to start reaching your audience and tracking performance."
            ctaLabel="Create Campaign"
            ctaIcon={Plus}
            onCtaClick={openDialog}
          />
        ) : (
          <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl overflow-hidden">
            <div className="border-b border-[#1f1f1f]">
              <div className="grid grid-cols-6 gap-4 px-5 py-3">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Campaign</span>
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</span>
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Impressions</span>
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Clicks</span>
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Conversions</span>
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Spend</span>
              </div>
            </div>
            <div className="divide-y divide-[#1f1f1f]">
              {campaigns.map((campaign) => {
                const ctr = campaign.impressions > 0 
                  ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2)
                  : "0.00";
                return (
                  <div key={campaign.id} className="grid grid-cols-6 gap-4 px-5 py-4">
                    <span className="text-white">{campaign.name}</span>
                    <span className={`capitalize ${
                      campaign.status === "active" ? "text-emerald-400" :
                      campaign.status === "paused" ? "text-amber-400" :
                      campaign.status === "completed" ? "text-blue-400" :
                      "text-neutral-400"
                    }`}>{campaign.status}</span>
                    <span className="text-white">{campaign.impressions.toLocaleString()}</span>
                    <span className="text-white">{campaign.clicks.toLocaleString()}</span>
                    <span className="text-white">{campaign.conversions.toLocaleString()}</span>
                    <span className="text-white">${campaign.spend.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </PageShell>

      {/* Create Campaign Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setShowCreateDialog(false)}
          />
          <div className="relative bg-[#161616] border border-[#1f1f1f] rounded-xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
              <h2 className="text-lg font-semibold text-white">Create Campaign</h2>
              <button 
                onClick={() => setShowCreateDialog(false)}
                className="p-1 text-neutral-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter campaign name"
                  className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your campaign goals..."
                  rows={3}
                  className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Objective
                </label>
                <select
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                >
                  <option value="">Select an objective</option>
                  <option value="awareness">Brand Awareness</option>
                  <option value="traffic">Website Traffic</option>
                  <option value="engagement">Engagement</option>
                  <option value="leads">Lead Generation</option>
                  <option value="sales">Sales</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1f1f1f]">
              <Button
                variant="ghost"
                onClick={() => setShowCreateDialog(false)}
                className="text-neutral-400 hover:text-white hover:bg-[#1f1f1f]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!name.trim() || creating}
                className="bg-amber-500 hover:bg-amber-600 text-black font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <>
                    <div className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create Campaign"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
