"use client";

import { PageShell, EmptyState } from "@/components/honeycomb/page-shell";
import { Search, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKeywords } from "@/lib/honeycomb/hooks";

export default function KeywordPlannerPage() {
  const { data, loading } = useKeywords();
  const savedKeywords = data?.keywords ?? [];
  const suggestions = data?.suggestions ?? [];

  return (
    <PageShell
      title="Keyword Planner"
      subtitle="Research and plan keywords for your search campaigns"
    >
      {/* Search Bar */}
      <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl p-6 mb-8">
        <h2 className="text-lg font-medium text-white mb-4">Discover Keywords</h2>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" />
            <input
              type="text"
              placeholder="Enter a keyword, phrase, or website"
              className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <Button className="bg-amber-500 hover:bg-amber-600 text-black font-medium px-6">
            Search
          </Button>
        </div>
        <div className="flex gap-2 mt-4">
          <span className="text-xs text-neutral-500">Suggestions:</span>
          <button className="text-xs text-amber-500 hover:underline">real estate</button>
          <button className="text-xs text-amber-500 hover:underline">luxury homes</button>
          <button className="text-xs text-amber-500 hover:underline">property investment</button>
        </div>
      </div>

      {/* Saved Keywords */}
      <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl overflow-hidden mb-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
          <h2 className="text-lg font-medium text-white">Saved Keywords</h2>
        </div>
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : savedKeywords.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No saved keywords yet"
            description="Search for keywords and save them to build your keyword strategy."
          />
        ) : (
          <div className="divide-y divide-[#1f1f1f]">
            {savedKeywords.map((keyword) => (
              <div key={keyword.id} className="px-6 py-4 grid grid-cols-4 gap-4">
                <span className="text-white">{keyword.keyword}</span>
                <span className="text-neutral-400">{keyword.searchVolume?.toLocaleString() ?? "—"} searches</span>
                <span className="text-neutral-400 capitalize">{keyword.competition ?? "—"}</span>
                <span className="text-neutral-400">{keyword.cpcEstimate ? `$${keyword.cpcEstimate.toFixed(2)}` : "—"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Keyword Ideas */}
      <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
          <h2 className="text-lg font-medium text-white">Keyword Ideas</h2>
        </div>
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : suggestions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <TrendingUp className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
            <p className="text-sm text-neutral-500">
              Search for a keyword above to see related keyword ideas and metrics
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#1f1f1f]">
            {suggestions.map((keyword) => (
              <div key={keyword.id} className="px-6 py-4 grid grid-cols-4 gap-4">
                <span className="text-white">{keyword.keyword}</span>
                <span className="text-neutral-400">{keyword.searchVolume?.toLocaleString() ?? "—"} searches</span>
                <span className="text-neutral-400 capitalize">{keyword.competition ?? "—"}</span>
                <span className="text-neutral-400">{keyword.cpcEstimate ? `$${keyword.cpcEstimate.toFixed(2)}` : "—"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
