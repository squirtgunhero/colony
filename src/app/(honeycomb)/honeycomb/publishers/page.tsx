"use client";

import { PageShell, KpiCard, DataTableShell } from "@/components/honeycomb/page-shell";
import { Globe, Plus, Link2, Trash2, Copy, Check, Layout } from "lucide-react";
import { usePublishers } from "@/lib/honeycomb/hooks";
import { createPublisher, deletePublisher } from "@/lib/honeycomb/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useCallback } from "react";

type PublisherType = "ad_network" | "direct" | "programmatic";

interface Zone {
  id: string;
  publisherId: string;
  publisherName: string;
  name: string;
  format: string;
  siteUrl: string;
  active: boolean;
  impressions: number;
  clicks: number;
  embedCode: string;
  createdAt: string;
}

export default function PublishersPage() {
  const { data, loading, refetch } = usePublishers();
  const publishers = data?.publishers ?? [];
  const placements = data?.placements ?? [];

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPublisherName, setNewPublisherName] = useState("");
  const [newPublisherType, setNewPublisherType] = useState<PublisherType>("ad_network");
  const [isCreating, setIsCreating] = useState(false);

  const [zones, setZones] = useState<Zone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [isCreateZoneOpen, setIsCreateZoneOpen] = useState(false);
  const [zonePublisherId, setZonePublisherId] = useState("");
  const [zoneName, setZoneName] = useState("");
  const [zoneFormat, setZoneFormat] = useState("300x250");
  const [zoneSiteUrl, setZoneSiteUrl] = useState("");
  const [creatingZone, setCreatingZone] = useState(false);
  const [copiedZoneId, setCopiedZoneId] = useState<string | null>(null);

  const connectedPublishers = publishers.filter(p => p.status === "connected").length;
  const totalPlacements = placements.length;
  const totalRevenue = publishers.reduce((sum, p) => sum + (p.revenue ?? 0), 0);

  const fetchZones = useCallback(async () => {
    try {
      setZonesLoading(true);
      const res = await fetch("/api/honeycomb/zones");
      if (res.ok) {
        const data = await res.json();
        setZones(data.zones || []);
      }
    } catch (err) {
      console.error("Failed to fetch zones:", err);
    } finally {
      setZonesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  const handleCreatePublisher = async () => {
    if (!newPublisherName) return;
    setIsCreating(true);
    try {
      await createPublisher({ name: newPublisherName, type: newPublisherType });
      setIsCreateDialogOpen(false);
      setNewPublisherName("");
      setNewPublisherType("ad_network");
      refetch();
    } catch (error) {
      console.error("Failed to create publisher:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeletePublisher = async (id: string) => {
    if (window.confirm("Are you sure you want to remove this publisher?")) {
      try {
        await deletePublisher(id);
        refetch();
        fetchZones();
      } catch (error) {
        console.error("Failed to delete publisher:", error);
      }
    }
  };

  const handleCreateZone = async () => {
    if (!zonePublisherId || !zoneName || !zoneSiteUrl) return;
    setCreatingZone(true);
    try {
      const res = await fetch("/api/honeycomb/zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publisherId: zonePublisherId,
          name: zoneName,
          format: zoneFormat,
          siteUrl: zoneSiteUrl,
        }),
      });
      if (res.ok) {
        setIsCreateZoneOpen(false);
        setZoneName("");
        setZoneFormat("300x250");
        setZoneSiteUrl("");
        setZonePublisherId("");
        fetchZones();
      }
    } catch (error) {
      console.error("Failed to create zone:", error);
    } finally {
      setCreatingZone(false);
    }
  };

  const handleDeactivateZone = async (zoneId: string) => {
    try {
      await fetch(`/api/honeycomb/zones?id=${zoneId}`, { method: "DELETE" });
      fetchZones();
    } catch (error) {
      console.error("Failed to deactivate zone:", error);
    }
  };

  const copyEmbedCode = (zoneId: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedZoneId(zoneId);
    setTimeout(() => setCopiedZoneId(null), 2000);
  };

  return (
    <PageShell
      title="Publishers"
      subtitle="Manage publisher integrations and ad placements"
      ctaLabel="Add Publisher"
      ctaIcon={Plus}
      onCtaClick={() => setIsCreateDialogOpen(true)}
    >
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
          label="Ad Zones"
          value={zones.length > 0 ? zones.filter(z => z.active).length : undefined}
          loading={zonesLoading}
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
              <p className="text-sm text-neutral-400 text-center max-w-sm mb-4">
                Connect to ad networks and publishers to distribute your campaigns.
              </p>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Publisher
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {publishers.map((publisher) => (
                <div key={publisher.id} className="bg-[#1f1f1f] rounded-lg p-4 text-center relative group">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeletePublisher(publisher.id)}
                    className="absolute top-2 right-2 text-neutral-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
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

      {/* Ad Zones */}
      <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl overflow-hidden mb-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
          <h2 className="text-lg font-medium text-white">Ad Zones</h2>
          {publishers.length > 0 && (
            <Button
              onClick={() => setIsCreateZoneOpen(true)}
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Zone
            </Button>
          )}
        </div>
        <div className="p-6">
          {zonesLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : zones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1f1f1f] mb-4">
                <Layout className="h-7 w-7 text-neutral-500" />
              </div>
              <h3 className="text-base font-medium text-white mb-1">No ad zones yet</h3>
              <p className="text-sm text-neutral-400 text-center max-w-sm mb-4">
                Create ad zones to place ads on your websites. Each zone generates an embed code you can paste into your HTML.
              </p>
              {publishers.length > 0 && (
                <Button
                  onClick={() => setIsCreateZoneOpen(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Zone
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className={`bg-[#0c0c0c] border rounded-lg p-4 ${zone.active ? "border-[#2a2a2a]" : "border-[#1f1f1f] opacity-50"}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-white font-medium">{zone.name}</h4>
                      <p className="text-neutral-500 text-sm">
                        {zone.publisherName} &middot; {zone.format} &middot; {zone.siteUrl}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400">
                        {zone.impressions.toLocaleString()} imp &middot; {zone.clicks.toLocaleString()} clicks
                      </span>
                      {zone.active && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeactivateZone(zone.id)}
                          className="h-7 w-7 text-neutral-500 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {zone.active && (
                    <div className="relative">
                      <pre className="bg-[#161616] border border-[#1f1f1f] rounded-md p-3 text-xs text-neutral-400 overflow-x-auto">
                        {zone.embedCode}
                      </pre>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyEmbedCode(zone.id, zone.embedCode)}
                        className="absolute top-2 right-2 h-7 w-7 text-neutral-500 hover:text-white bg-[#161616]"
                      >
                        {copiedZoneId === zone.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  )}
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
          onCtaClick={() => setIsCreateDialogOpen(true)}
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

      {/* Create Publisher Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#161616] border-[#1f1f1f] text-white">
          <DialogHeader>
            <DialogTitle>Add Publisher</DialogTitle>
            <DialogDescription>
              Connect a new publisher or ad network.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Publisher Name *</Label>
              <Input
                id="name"
                value={newPublisherName}
                onChange={(e) => setNewPublisherName(e.target.value)}
                placeholder="e.g., My Business Website"
                className="bg-[#0c0c0c] border-[#1f1f1f] text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select onValueChange={(value: PublisherType) => setNewPublisherType(value)} value={newPublisherType}>
                <SelectTrigger className="bg-[#0c0c0c] border-[#1f1f1f] text-white">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-[#161616] border-[#1f1f1f] text-white">
                  <SelectItem value="ad_network">Ad Network</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="programmatic">Programmatic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              className="border-[#1f1f1f] text-neutral-300 hover:bg-[#1f1f1f]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePublisher}
              disabled={!newPublisherName || isCreating}
              className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
            >
              {isCreating ? "Adding..." : "Add Publisher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Zone Dialog */}
      <Dialog open={isCreateZoneOpen} onOpenChange={setIsCreateZoneOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#161616] border-[#1f1f1f] text-white">
          <DialogHeader>
            <DialogTitle>Create Ad Zone</DialogTitle>
            <DialogDescription>
              Define a placement slot on your website where ads will appear.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Publisher *</Label>
              <Select onValueChange={setZonePublisherId} value={zonePublisherId}>
                <SelectTrigger className="bg-[#0c0c0c] border-[#1f1f1f] text-white">
                  <SelectValue placeholder="Select publisher" />
                </SelectTrigger>
                <SelectContent className="bg-[#161616] border-[#1f1f1f] text-white">
                  {publishers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Zone Name *</Label>
              <Input
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                placeholder="e.g., Sidebar, Above the fold, Footer"
                className="bg-[#0c0c0c] border-[#1f1f1f] text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label>Format</Label>
              <Select onValueChange={setZoneFormat} value={zoneFormat}>
                <SelectTrigger className="bg-[#0c0c0c] border-[#1f1f1f] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#161616] border-[#1f1f1f] text-white">
                  <SelectItem value="300x250">300x250 (Medium Rectangle)</SelectItem>
                  <SelectItem value="728x90">728x90 (Leaderboard)</SelectItem>
                  <SelectItem value="1200x628">1200x628 (Large Banner)</SelectItem>
                  <SelectItem value="1080x1080">1080x1080 (Square)</SelectItem>
                  <SelectItem value="1080x1920">1080x1920 (Story)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Site URL *</Label>
              <Input
                value={zoneSiteUrl}
                onChange={(e) => setZoneSiteUrl(e.target.value)}
                placeholder="https://mybusiness.com"
                className="bg-[#0c0c0c] border-[#1f1f1f] text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateZoneOpen(false)}
              className="border-[#1f1f1f] text-neutral-300 hover:bg-[#1f1f1f]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateZone}
              disabled={!zonePublisherId || !zoneName || !zoneSiteUrl || creatingZone}
              className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
            >
              {creatingZone ? "Creating..." : "Create Zone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
