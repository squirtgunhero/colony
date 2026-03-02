"use client";

import { Search } from "lucide-react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";

export interface MarketplaceStats {
  totalOpen: number;
  totalCategories: number;
  totalClaimed: number;
  totalValue: number;
}

interface MarketplaceHeroProps {
  stats: MarketplaceStats | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
}

function formatCompactNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return num.toString();
}

function formatCurrencyCompact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

export function MarketplaceHero({
  stats,
  search,
  onSearchChange,
  onSearchSubmit,
}: MarketplaceHeroProps) {
  const { theme } = useColonyTheme();

  const statItems = stats
    ? [
        { label: "Open Referrals", value: formatCompactNumber(stats.totalOpen) },
        { label: "Categories", value: stats.totalCategories.toString() },
        { label: "Total Claimed", value: formatCompactNumber(stats.totalClaimed) },
        { label: "Total Value", value: formatCurrencyCompact(stats.totalValue) },
      ]
    : null;

  return (
    <div className="relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${withAlpha(theme.accent, 0.08)} 0%, transparent 70%)`,
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="text-center max-w-2xl mx-auto">
          <h1
            className="text-4xl sm:text-5xl font-light tracking-tight mb-4"
            style={{ color: theme.text }}
          >
            Find & Share{" "}
            <span style={{ color: theme.accent }}>Referrals</span>
          </h1>
          <p className="text-lg mb-8" style={{ color: theme.textMuted }}>
            Browse open referral opportunities from local professionals. Claim a
            referral, close a deal, grow your network.
          </p>

          <div className="relative max-w-xl mx-auto mb-10">
            <div
              className="flex items-center rounded-xl overflow-hidden"
              style={{
                backgroundColor: theme.bgGlow,
                boxShadow:
                  "4px 4px 8px rgba(0,0,0,0.4), -4px -4px 8px rgba(255,255,255,0.04)",
              }}
            >
              <Search
                className="h-5 w-5 ml-4 shrink-0"
                style={{ color: theme.textMuted }}
              />
              <input
                type="text"
                placeholder="Search referrals by title, description, or location..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSearchSubmit()}
                className="flex-1 bg-transparent border-none outline-none px-3 py-3.5 text-sm placeholder:opacity-50"
                style={{ color: theme.text }}
              />
              <button
                onClick={onSearchSubmit}
                className="px-5 py-3.5 text-sm font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: theme.accent, color: "#fff" }}
              >
                Search
              </button>
            </div>
          </div>

          {statItems && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
              {statItems.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl px-4 py-3"
                  style={{ backgroundColor: withAlpha(theme.text, 0.04) }}
                >
                  <div
                    className="text-2xl font-semibold"
                    style={{ color: theme.accent }}
                  >
                    {stat.value}
                  </div>
                  <div
                    className="text-xs mt-0.5"
                    style={{ color: theme.textMuted }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
