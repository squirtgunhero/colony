"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Handshake, DollarSign, User, Home, MoreHorizontal } from "lucide-react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { formatCurrency, formatDate } from "@/lib/date-utils";

interface Deal {
  id: string;
  title: string;
  value: number | null;
  stage: string;
  probability?: number | null;
  expectedCloseDate?: Date | null;
  updatedAt: Date;
  contact?: { id: string; name: string } | null;
  property?: { id: string; address: string } | null;
}

interface DealsListViewProps {
  deals: Deal[];
}

const STAGES = ["Lead", "Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];

export function DealsListView({ deals }: DealsListViewProps) {
  const { theme } = useColonyTheme();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");

  const filteredDeals = deals.filter((deal) => {
    const matchesSearch = deal.title.toLowerCase().includes(search.toLowerCase());
    const matchesStage =
      stageFilter === "all" || deal.stage.toLowerCase() === stageFilter.toLowerCase();
    return matchesSearch && matchesStage;
  });

  const stages = ["all", ...STAGES];
  const totalValue = filteredDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);
  const weightedValue = filteredDeals.reduce(
    (sum, deal) => sum + (deal.value || 0) * ((deal.probability || 0) / 100),
    0
  );

  const neumorphicRaised = `4px 4px 8px rgba(0,0,0,0.4), -4px -4px 8px rgba(255,255,255,0.04)`;
  const neumorphicRecessed = `inset 3px 3px 6px rgba(0,0,0,0.3), inset -3px -3px 6px rgba(255,255,255,0.02)`;
  const dividerColor = withAlpha(theme.text, 0.06);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-[28px] leading-tight font-semibold tracking-[-0.01em]"
            style={{ color: theme.text, fontFamily: "'Spectral', serif" }}
          >
            Deals
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: theme.textMuted, fontFamily: "'DM Sans', sans-serif" }}
          >
            {filteredDeals.length} deal{filteredDeals.length !== 1 ? "s" : ""} ·{" "}
            {formatCurrency(totalValue)} total
          </p>
        </div>
        <Link
          href="/browse/deals/new"
          className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
          style={{
            backgroundColor: theme.accent,
            color: theme.bg,
            boxShadow: neumorphicRaised,
          }}
        >
          New Deal
        </Link>
      </div>

      {/* Summary */}
      <div
        className="flex gap-6 p-4 rounded-xl"
        style={{
          backgroundColor: theme.bgGlow,
          boxShadow: neumorphicRaised,
        }}
      >
        <div>
          <p className="text-xs mb-1" style={{ color: theme.textMuted }}>
            Pipeline Value
          </p>
          <p className="text-xl font-semibold" style={{ color: theme.text }}>
            {formatCurrency(totalValue)}
          </p>
        </div>
        <div>
          <p className="text-xs mb-1" style={{ color: theme.textMuted }}>
            Weighted Value
          </p>
          <p className="text-xl font-semibold" style={{ color: theme.text }}>
            {formatCurrency(weightedValue)}
          </p>
        </div>
        <div>
          <p className="text-xs mb-1" style={{ color: theme.textMuted }}>
            Active Deals
          </p>
          <p className="text-xl font-semibold" style={{ color: theme.text }}>
            {filteredDeals.filter((d) => !d.stage.toLowerCase().includes("closed")).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
            style={{ color: theme.textMuted }}
          />
          <input
            placeholder="Search deals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-xl text-sm outline-none transition-all"
            style={{
              backgroundColor: "rgba(255,255,255,0.03)",
              boxShadow: neumorphicRecessed,
              border: `1px solid ${dividerColor}`,
              color: theme.text,
              caretColor: theme.accent,
              fontFamily: "'DM Sans', sans-serif",
            }}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {stages.slice(0, 5).map((stage) => {
            const isActive = stageFilter.toLowerCase() === stage.toLowerCase();
            return (
              <button
                key={stage}
                onClick={() => setStageFilter(stage)}
                className="px-3 py-1.5 text-sm rounded-lg capitalize transition-all duration-200"
                style={{
                  backgroundColor: isActive ? withAlpha(theme.accent, 0.15) : "transparent",
                  color: isActive ? theme.accent : theme.textMuted,
                  boxShadow: isActive ? neumorphicRaised : "none",
                }}
              >
                {stage}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filteredDeals.length === 0 ? (
          <div className="text-center py-12">
            <Handshake className="h-12 w-12 mx-auto mb-4" style={{ color: theme.accent, opacity: 0.4 }} />
            <p style={{ color: theme.textMuted }}>No deals found</p>
          </div>
        ) : (
          filteredDeals.map((deal) => (
            <Link
              key={deal.id}
              href={`/deals/${deal.id}`}
              className="flex items-center gap-4 p-4 rounded-xl transition-all duration-200 group"
              style={{
                backgroundColor: theme.bgGlow,
                boxShadow: neumorphicRaised,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `2px 2px 4px rgba(0,0,0,0.3), -2px -2px 4px rgba(255,255,255,0.03), 0 0 12px ${withAlpha(theme.accent, 0.1)}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = neumorphicRaised;
              }}
            >
              {/* Icon */}
              <div
                className="flex items-center justify-center h-12 w-12 rounded-xl shrink-0"
                style={{ backgroundColor: withAlpha(theme.accent, 0.15) }}
              >
                <Handshake className="h-5 w-5" style={{ color: theme.accent }} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium truncate" style={{ color: theme.text }}>
                    {deal.title}
                  </h3>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: withAlpha(theme.accent, 0.15),
                      color: theme.accent,
                    }}
                  >
                    {deal.stage}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm" style={{ color: theme.textMuted }}>
                  {deal.contact && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {deal.contact.name}
                    </span>
                  )}
                  {deal.property && (
                    <span className="flex items-center gap-1 truncate">
                      <Home className="h-3 w-3" />
                      {deal.property.address}
                    </span>
                  )}
                </div>
              </div>

              {/* Value */}
              <div className="text-right">
                <div
                  className="flex items-center gap-1 text-lg font-semibold"
                  style={{ color: theme.accent }}
                >
                  <DollarSign className="h-4 w-4" />
                  {formatCurrency(deal.value || 0).replace("$", "")}
                </div>
                {deal.probability && (
                  <p className="text-xs" style={{ color: theme.textMuted }}>
                    {deal.probability}% probability
                  </p>
                )}
              </div>

              {/* Actions */}
              <button
                className="h-8 w-8 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: theme.textMuted }}
                onClick={(e) => e.preventDefault()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
