"use client";

import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { MapPin } from "lucide-react";

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "real_estate", label: "Real Estate" },
  { key: "plumbing", label: "Plumbing" },
  { key: "electrical", label: "Electrical" },
  { key: "finance", label: "Finance" },
  { key: "legal", label: "Legal" },
  { key: "insurance", label: "Insurance" },
  { key: "contractor", label: "Contractor" },
  { key: "landscaping", label: "Landscaping" },
  { key: "cleaning", label: "Cleaning" },
  { key: "moving", label: "Moving" },
  { key: "other", label: "Other" },
];

const SORT_OPTIONS = [
  { key: "newest", label: "Newest" },
  { key: "value", label: "Highest Value" },
  { key: "active", label: "Most Active" },
];

interface MarketplaceFiltersProps {
  category: string;
  sort: string;
  location: string;
  onCategoryChange: (category: string) => void;
  onSortChange: (sort: string) => void;
  onLocationChange: (location: string) => void;
  onLocationSubmit: () => void;
}

export function MarketplaceFilters({
  category,
  sort,
  location,
  onCategoryChange,
  onSortChange,
  onLocationChange,
  onLocationSubmit,
}: MarketplaceFiltersProps) {
  const { theme } = useColonyTheme();

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {CATEGORIES.map((cat) => {
          const active = category === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => onCategoryChange(cat.key)}
              className="shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200"
              style={{
                backgroundColor: active
                  ? theme.accent
                  : withAlpha(theme.text, 0.06),
                color: active ? "#fff" : theme.textMuted,
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <MapPin
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
            style={{ color: theme.textMuted }}
          />
          <input
            type="text"
            placeholder="Filter by location..."
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onLocationSubmit()}
            onBlur={onLocationSubmit}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-transparent border outline-none"
            style={{
              borderColor: withAlpha(theme.text, 0.1),
              color: theme.text,
            }}
          />
        </div>

        <div className="flex gap-2">
          {SORT_OPTIONS.map((opt) => {
            const active = sort === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => onSortChange(opt.key)}
                className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor: active
                    ? withAlpha(theme.accent, 0.15)
                    : "transparent",
                  color: active ? theme.accent : theme.textMuted,
                  border: `1px solid ${
                    active
                      ? withAlpha(theme.accent, 0.3)
                      : withAlpha(theme.text, 0.1)
                  }`,
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
