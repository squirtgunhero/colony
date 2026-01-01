"use client";

import { useState } from "react";
import { PageShell, EmptyState } from "@/components/honeycomb/page-shell";
import { Plus, Image, X } from "lucide-react";
import { useCreatives } from "@/lib/honeycomb/hooks";
import { createCreative } from "@/lib/honeycomb/api";
import { Button } from "@/components/ui/button";

export default function CreativesPage() {
  const { data, loading, refetch } = useCreatives();
  const creatives = data?.creatives ?? [];
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("image");
  const [format, setFormat] = useState<string>("");
  const [headline, setHeadline] = useState("");
  const [ctaText, setCtaText] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    
    try {
      setCreating(true);
      await createCreative({
        name: name.trim(),
        description: description.trim() || undefined,
        type: type as "image" | "video" | "carousel" | "html",
        format: format || undefined,
        headline: headline.trim() || undefined,
        ctaText: ctaText.trim() || undefined,
      });
      setShowCreateDialog(false);
      setName("");
      setDescription("");
      setType("image");
      setFormat("");
      setHeadline("");
      setCtaText("");
      await refetch();
    } catch (error) {
      console.error("Failed to create creative:", error);
    } finally {
      setCreating(false);
    }
  };

  const openDialog = () => setShowCreateDialog(true);

  return (
    <>
      <PageShell
        title="Creatives"
        subtitle="Design and manage your ad creatives and assets"
        ctaLabel="Create Creative"
        ctaIcon={Plus}
        onCtaClick={openDialog}
      >
        {/* Filter Bar */}
        <div className="flex items-center gap-3 mb-6">
          <select className="bg-[#161616] border border-[#1f1f1f] rounded-lg px-3 py-2 text-sm text-neutral-300">
            <option>All Types</option>
            <option>Images</option>
            <option>Videos</option>
            <option>Carousels</option>
          </select>
          <select className="bg-[#161616] border border-[#1f1f1f] rounded-lg px-3 py-2 text-sm text-neutral-300">
            <option>All Sizes</option>
            <option>1080x1080</option>
            <option>1200x628</option>
            <option>1080x1920</option>
          </select>
          <div className="flex-1" />
          <div className="flex gap-2">
            <button className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </button>
            <button className="p-2 bg-[#161616] text-neutral-400 rounded-lg hover:text-neutral-200">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Creatives Grid */}
        <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : creatives.length === 0 ? (
            <EmptyState
              icon={Image}
              title="No creatives yet"
              description="Upload or design your first creative to use in your campaigns."
              ctaLabel="Create Creative"
              ctaIcon={Plus}
              onCtaClick={openDialog}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-6">
              {creatives.map((creative) => (
                <div key={creative.id} className="bg-[#1f1f1f] rounded-lg overflow-hidden group">
                  <div className="aspect-square bg-[#2a2a2a] flex items-center justify-center relative">
                    {creative.thumbnailUrl ? (
                      <img src={creative.thumbnailUrl} alt={creative.name} className="w-full h-full object-cover" />
                    ) : (
                      <Image className="h-8 w-8 text-neutral-600" />
                    )}
                    <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium ${
                      creative.status === "approved" ? "bg-emerald-500/20 text-emerald-400" :
                      creative.status === "rejected" ? "bg-red-500/20 text-red-400" :
                      creative.status === "archived" ? "bg-neutral-500/20 text-neutral-400" :
                      "bg-amber-500/20 text-amber-400"
                    }`}>
                      {creative.status}
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-white text-sm font-medium truncate">{creative.name}</p>
                    <p className="text-neutral-400 text-xs capitalize">{creative.type}{creative.format ? ` • ${creative.format}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageShell>

      {/* Create Creative Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setShowCreateDialog(false)}
          />
          <div className="relative bg-[#161616] border border-[#1f1f1f] rounded-xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
              <h2 className="text-lg font-semibold text-white">Create Creative</h2>
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
                  Creative Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter creative name"
                  className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                  >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                    <option value="carousel">Carousel</option>
                    <option value="html">HTML</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Format/Size
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                  >
                    <option value="">Select size</option>
                    <option value="1080x1080">1080x1080</option>
                    <option value="1200x628">1200x628</option>
                    <option value="1080x1920">1080x1920</option>
                    <option value="300x250">300x250</option>
                    <option value="728x90">728x90</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this creative..."
                  rows={2}
                  className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Headline
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Ad headline text"
                  className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  CTA Text
                </label>
                <input
                  type="text"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="e.g., Learn More, Shop Now"
                  className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                />
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
                  "Create Creative"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
