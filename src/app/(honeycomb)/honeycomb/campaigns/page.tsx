"use client";

import { useState } from "react";
import { PageShell, KpiCard, DataTableShell } from "@/components/honeycomb/page-shell";
import { Megaphone, Plus, X, Globe, Bot, Search, Monitor, Handshake, Facebook, ArrowLeft } from "lucide-react";
import { useCampaigns } from "@/lib/honeycomb/hooks";
import { createCampaign } from "@/lib/honeycomb/api";
import { Button } from "@/components/ui/button";
import type { AdChannel } from "@/lib/honeycomb/types";

const CHANNELS: Array<{
  key: AdChannel;
  label: string;
  sublabel: string;
  icon: typeof Globe;
  status: "active" | "coming_soon";
}> = [
  { key: "meta", label: "Facebook & Instagram", sublabel: "Run ads on Meta's network", icon: Facebook, status: "active" },
  { key: "native", label: "Honeycomb Network", sublabel: "Show ads on local business websites", icon: Globe, status: "active" },
  { key: "llm", label: "LLM Placement", sublabel: "Get recommended by AI assistants", icon: Bot, status: "active" },
  { key: "google", label: "Google Ads", sublabel: "Search and display ads", icon: Search, status: "coming_soon" },
  { key: "bing", label: "Microsoft Ads", sublabel: "Bing search ads", icon: Monitor, status: "coming_soon" },
  { key: "local", label: "Local Exchange", sublabel: "Auto-match with nearby businesses", icon: Handshake, status: "active" },
];

const CHANNEL_LABELS: Record<string, string> = {
  meta: "Meta",
  native: "Native",
  llm: "LLM",
  google: "Google",
  bing: "Bing",
  local: "Local",
};

export default function CampaignsPage() {
  const { data, loading, refetch } = useCampaigns();
  const campaigns = data?.campaigns ?? [];
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);

  const [step, setStep] = useState<"channel" | "details">("channel");
  const [selectedChannel, setSelectedChannel] = useState<AdChannel | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [objective, setObjective] = useState<string>("");
  const [dailyBudget, setDailyBudget] = useState("10");

  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");

  const activeCampaigns = campaigns.filter(c => c.status === "active").length;
  const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);
  const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);

  const resetForm = () => {
    setStep("channel");
    setSelectedChannel(null);
    setName("");
    setDescription("");
    setObjective("");
    setDailyBudget("10");
    setBusinessName("");
    setCategory("");
    setServiceArea("");
    setPhone("");
    setWebsite("");
  };

  const handleCreate = async () => {
    if (!name.trim() || !selectedChannel) return;

    try {
      setCreating(true);
      await createCampaign({
        name: name.trim(),
        description: description.trim() || undefined,
        objective: objective as "awareness" | "traffic" | "engagement" | "leads" | "sales" | undefined,
        channel: selectedChannel,
        dailyBudget: dailyBudget ? parseFloat(dailyBudget) : undefined,
        ...(selectedChannel === "llm" ? {
          businessName: businessName.trim() || undefined,
          category: category.trim() || undefined,
          serviceArea: serviceArea.trim() || undefined,
          phone: phone.trim() || undefined,
          website: website.trim() || undefined,
        } : {}),
      });
      setShowCreateDialog(false);
      resetForm();
      await refetch();
    } catch (error) {
      console.error("Failed to create campaign:", error);
    } finally {
      setCreating(false);
    }
  };

  const openDialog = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const selectChannel = (ch: AdChannel) => {
    setSelectedChannel(ch);
    setStep("details");
  };

  return (
    <>
      <PageShell
        title="Campaigns"
        subtitle="Manage your marketing campaigns across all channels"
        ctaLabel="Create Campaign"
        ctaIcon={Plus}
        onCtaClick={openDialog}
      >
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

        {loading ? (
          <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl p-8 flex justify-center">
            <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          <DataTableShell
            columns={["Campaign", "Channel", "Status", "Impressions", "Clicks", "Spend"]}
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
              <div className="grid grid-cols-7 gap-4 px-5 py-3">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Campaign</span>
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Channel</span>
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</span>
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Impressions</span>
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Clicks</span>
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Conversions</span>
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Spend</span>
              </div>
            </div>
            <div className="divide-y divide-[#1f1f1f]">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="grid grid-cols-7 gap-4 px-5 py-4">
                  <span className="text-white">{campaign.name}</span>
                  <span className="text-neutral-400 text-sm">
                    {CHANNEL_LABELS[campaign.channel || "native"] || campaign.channel}
                  </span>
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
              ))}
            </div>
          </div>
        )}
      </PageShell>

      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { setShowCreateDialog(false); resetForm(); }}
          />
          <div className="relative bg-[#161616] border border-[#1f1f1f] rounded-xl w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
              <div className="flex items-center gap-3">
                {step === "details" && (
                  <button
                    onClick={() => setStep("channel")}
                    className="p-1 text-neutral-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <h2 className="text-lg font-semibold text-white">
                  {step === "channel" ? "Choose a Channel" : "Campaign Details"}
                </h2>
              </div>
              <button
                onClick={() => { setShowCreateDialog(false); resetForm(); }}
                className="p-1 text-neutral-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {step === "channel" ? (
              <div className="p-6 grid grid-cols-2 gap-3">
                {CHANNELS.map((ch) => {
                  const Icon = ch.icon;
                  const isComingSoon = ch.status === "coming_soon";
                  return (
                    <button
                      key={ch.key}
                      onClick={() => selectChannel(ch.key)}
                      className={`relative flex flex-col items-center p-4 rounded-lg border text-center transition-all ${
                        isComingSoon
                          ? "border-[#1f1f1f] bg-[#0c0c0c] opacity-60 hover:opacity-80"
                          : "border-[#2a2a2a] bg-[#0c0c0c] hover:border-amber-500/50 hover:bg-[#1a1a1a]"
                      }`}
                    >
                      {isComingSoon && (
                        <span className="absolute top-2 right-2 text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded">
                          Soon
                        </span>
                      )}
                      <div className="h-10 w-10 rounded-lg bg-[#1f1f1f] flex items-center justify-center mb-2">
                        <Icon className="h-5 w-5 text-amber-500" />
                      </div>
                      <span className="text-white text-sm font-medium">{ch.label}</span>
                      <span className="text-neutral-500 text-xs mt-1">{ch.sublabel}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                {selectedChannel && (selectedChannel === "google" || selectedChannel === "bing") && (
                  <div className="mx-6 mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-amber-400 text-sm">
                      {selectedChannel === "google" ? "Google Ads" : "Microsoft Ads"} integration is coming soon. Your campaign will be saved and activated when the integration launches.
                    </p>
                  </div>
                )}

                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">Campaign Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter campaign name"
                      className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                    />
                  </div>

                  {(selectedChannel === "meta" || selectedChannel === "native") && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">Objective</label>
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
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">Daily Budget ($)</label>
                        <input
                          type="number"
                          value={dailyBudget}
                          onChange={(e) => setDailyBudget(e.target.value)}
                          placeholder="10"
                          min="1"
                          className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                        />
                      </div>
                    </>
                  )}

                  {selectedChannel === "llm" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">Business Name</label>
                        <input
                          type="text"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder="Mike's Plumbing"
                          className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">Category</label>
                        <input
                          type="text"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          placeholder="plumbing, real_estate, barber..."
                          className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">Description</label>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Licensed plumber serving Morris County..."
                          rows={2}
                          className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">Service Area</label>
                        <input
                          type="text"
                          value={serviceArea}
                          onChange={(e) => setServiceArea(e.target.value)}
                          placeholder="Montville, NJ"
                          className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-neutral-300 mb-2">Phone</label>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="973-555-0100"
                            className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-300 mb-2">Website</label>
                          <input
                            type="url"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {(selectedChannel === "google" || selectedChannel === "bing") && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">Objective</label>
                        <select
                          value={objective}
                          onChange={(e) => setObjective(e.target.value)}
                          className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                        >
                          <option value="">Select an objective</option>
                          <option value="awareness">Brand Awareness</option>
                          <option value="traffic">Website Traffic</option>
                          <option value="leads">Lead Generation</option>
                          <option value="sales">Sales</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">Daily Budget ($)</label>
                        <input
                          type="number"
                          value={dailyBudget}
                          onChange={(e) => setDailyBudget(e.target.value)}
                          placeholder="10"
                          min="1"
                          className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                        />
                      </div>
                    </>
                  )}

                  {selectedChannel === "local" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">Business Category</label>
                        <input
                          type="text"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          placeholder="plumbing, barber, real_estate..."
                          className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">Service Area</label>
                        <input
                          type="text"
                          value={serviceArea}
                          onChange={(e) => setServiceArea(e.target.value)}
                          placeholder="Montville, NJ"
                          className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1f1f1f]">
                  <Button
                    variant="ghost"
                    onClick={() => { setShowCreateDialog(false); resetForm(); }}
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
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
