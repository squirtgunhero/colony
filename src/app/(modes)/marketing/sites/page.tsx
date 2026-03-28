"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { PageHeader } from "@/components/layout/page-header";
import { SiteCard } from "@/components/sites/SiteCard";
import { Globe, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SiteSummary {
  id: string;
  name: string;
  slug: string;
  status: string;
  views: number;
  leads: number;
  updatedAt: string;
}

export default function SitesPage() {
  const { theme } = useColonyTheme();
  const router = useRouter();
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/sites")
      .then((r) => (r.ok ? r.json() : []))
      .then(setSites)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled Site" }),
      });
      if (res.ok) {
        const site = await res.json();
        router.push(`/marketing/sites/${site.id}`);
      }
    } catch {
      toast.error("Failed to create site");
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/sites/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSites((prev) => prev.filter((s) => s.id !== id));
        toast.success("Site deleted");
      }
    } catch {
      toast.error("Failed to delete site");
    }
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Sites"
        description="Build websites and landing pages with AI."
      />

      <div className="p-4 sm:p-6 max-w-5xl">
        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm" style={{ color: theme.textMuted }}>
            {sites.length} site{sites.length !== 1 ? "s" : ""}
          </p>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-[0.97]"
            style={{
              backgroundColor: theme.accent,
              color: theme.isDark ? "#000" : "#fff",
              opacity: creating ? 0.6 : 1,
            }}
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
            ) : (
              <Plus className="h-4 w-4" strokeWidth={1.5} />
            )}
            New Site
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-56 rounded-2xl animate-pulse"
                style={{ backgroundColor: withAlpha(theme.text, 0.04) }}
              />
            ))}
          </div>
        ) : sites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Globe
              className="h-12 w-12 mb-4"
              style={{ color: withAlpha(theme.text, 0.15) }}
              strokeWidth={1}
            />
            <p className="text-sm font-medium mb-1" style={{ color: theme.textMuted }}>
              No sites yet
            </p>
            <p className="text-xs mb-6" style={{ color: withAlpha(theme.text, 0.35) }}>
              Create your first AI-generated website
            </p>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.97]"
              style={{
                backgroundColor: theme.accent,
                color: theme.isDark ? "#000" : "#fff",
              }}
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              Create Site
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sites.map((site) => (
              <SiteCard key={site.id} site={site} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
