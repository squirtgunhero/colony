"use client";

import { useState } from "react";
import { PageShell, EmptyState } from "@/components/honeycomb/page-shell";
import { Target, Plus, Users, Trash2, X } from "lucide-react";
import { useSegments } from "@/lib/honeycomb/hooks";
import { createSegment, deleteSegment } from "@/lib/honeycomb/api";
import { Button } from "@/components/ui/button";

export default function TargetingPage() {
  const { data, loading, refetch } = useSegments();
  const segments = data?.segments ?? [];
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("custom");

  // Count segments by type
  const savedAudiences = segments.filter(s => s.type === "saved").length;
  const customAudiences = segments.filter(s => s.type === "custom").length;
  const lookalikeAudiences = segments.filter(s => s.type === "lookalike").length;

  const handleCreate = async () => {
    if (!name.trim()) return;
    
    try {
      setCreating(true);
      await createSegment({
        name: name.trim(),
        description: description.trim() || undefined,
        type: type as "saved" | "custom" | "lookalike",
      });
      setShowCreateDialog(false);
      setName("");
      setDescription("");
      setType("custom");
      await refetch();
    } catch (error) {
      console.error("Failed to create segment:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeleting(id);
      await deleteSegment(id);
      await refetch();
    } catch (error) {
      console.error("Failed to delete segment:", error);
    } finally {
      setDeleting(null);
    }
  };

  const openDialog = () => setShowCreateDialog(true);

  return (
    <>
      <PageShell
        title="Targeting"
        subtitle="Define and manage audience segments for your campaigns"
        ctaLabel="Create Audience"
        ctaIcon={Plus}
        onCtaClick={openDialog}
      >
        {/* Audience Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Saved Audiences Card */}
          <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Users className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">Saved Audiences</h3>
                <p className="text-2xl font-semibold text-white">
                  {loading ? "—" : savedAudiences}
                </p>
              </div>
            </div>
          </div>

          {/* Custom Audiences Card */}
          <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <Target className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">Custom Audiences</h3>
                <p className="text-2xl font-semibold text-white">
                  {loading ? "—" : customAudiences}
                </p>
              </div>
            </div>
          </div>

          {/* Lookalike Audiences Card */}
          <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="7" r="4" />
                  <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                  <circle cx="16" cy="11" r="3" />
                  <path d="M16 21v-1a3 3 0 0 1 3-3h0" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">Lookalike Audiences</h3>
                <p className="text-2xl font-semibold text-white">
                  {loading ? "—" : lookalikeAudiences}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Audiences List */}
        <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
            <h2 className="text-lg font-medium text-white">All Audiences</h2>
          </div>
          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : segments.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No audiences yet"
              description="Create your first audience segment to target the right people with your campaigns."
              ctaLabel="Create Audience"
              ctaIcon={Plus}
              onCtaClick={openDialog}
            />
          ) : (
            <div className="divide-y divide-[#1f1f1f]">
              {segments.map((segment) => (
                <div key={segment.id} className="px-6 py-4 flex items-center justify-between group">
                  <div>
                    <p className="text-white font-medium">{segment.name}</p>
                    <p className="text-sm text-neutral-400">
                      <span className={`capitalize ${
                        segment.type === "saved" ? "text-amber-400" :
                        segment.type === "lookalike" ? "text-blue-400" :
                        "text-purple-400"
                      }`}>{segment.type}</span>
                      {" audience"}
                      {segment.description && <span className="text-neutral-500"> • {segment.description}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-white">{segment.size?.toLocaleString() ?? "—"}</p>
                      <p className="text-xs text-neutral-500">people</p>
                    </div>
                    <button
                      onClick={() => handleDelete(segment.id)}
                      disabled={deleting === segment.id}
                      className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    >
                      {deleting === segment.id ? (
                        <div className="h-4 w-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageShell>

      {/* Create Segment Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setShowCreateDialog(false)}
          />
          <div className="relative bg-[#161616] border border-[#1f1f1f] rounded-xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
              <h2 className="text-lg font-semibold text-white">Create Audience</h2>
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
                  Audience Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter audience name"
                  className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                >
                  <option value="custom">Custom Audience</option>
                  <option value="saved">Saved Audience</option>
                  <option value="lookalike">Lookalike Audience</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this audience segment..."
                  rows={3}
                  className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 resize-none"
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
                  "Create Audience"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
