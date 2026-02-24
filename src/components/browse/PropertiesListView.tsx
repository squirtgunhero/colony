"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Home, MapPin, DollarSign } from "lucide-react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { formatCurrency, formatDate } from "@/lib/date-utils";

interface Property {
  id: string;
  address: string;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  price: number;
  status: string;
  updatedAt: Date;
  owner?: { id: string; name: string } | null;
  _count: {
    deals: number;
  };
}

interface PropertiesListViewProps {
  properties: Property[];
}

export function PropertiesListView({ properties }: PropertiesListViewProps) {
  const { theme } = useColonyTheme();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredProperties = properties.filter((property) => {
    const matchesSearch = property.address.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || property.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statuses = ["all", ...new Set(properties.map((p) => p.status))];

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
            Properties
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: theme.textMuted, fontFamily: "'DM Sans', sans-serif" }}
          >
            {filteredProperties.length} propert{filteredProperties.length !== 1 ? "ies" : "y"}
          </p>
        </div>
        <Link
          href="/browse/properties/new"
          className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
          style={{
            backgroundColor: theme.accent,
            color: theme.bg,
            boxShadow: neumorphicRaised,
          }}
        >
          Add Property
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
            style={{ color: theme.textMuted }}
          />
          <input
            placeholder="Search properties..."
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
          {statuses.map((status) => {
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className="px-3 py-1.5 text-sm rounded-lg capitalize transition-all duration-200"
                style={{
                  backgroundColor: isActive ? withAlpha(theme.accent, 0.15) : "transparent",
                  color: isActive ? theme.accent : theme.textMuted,
                  boxShadow: isActive ? neumorphicRaised : "none",
                }}
              >
                {(status ?? "").replace("_", " ")}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProperties.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Home className="h-12 w-12 mx-auto mb-4" style={{ color: theme.accent, opacity: 0.4 }} />
            <p style={{ color: theme.textMuted }}>No properties found</p>
          </div>
        ) : (
          filteredProperties.map((property) => (
            <Link
              key={property.id}
              href={`/properties/${property.id}`}
              className="flex flex-col p-4 rounded-xl transition-all duration-200 group"
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
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div
                  className="flex items-center justify-center h-10 w-10 rounded-lg"
                  style={{ backgroundColor: withAlpha(theme.accent, 0.15) }}
                >
                  <Home className="h-5 w-5" style={{ color: theme.accent }} />
                </div>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full capitalize font-medium"
                  style={{
                    backgroundColor: withAlpha(theme.accent, 0.15),
                    color: theme.accent,
                  }}
                >
                  {(property.status ?? "").replace("_", " ")}
                </span>
              </div>

              {/* Address */}
              <h3
                className="font-medium mb-1 truncate"
                style={{ color: theme.text }}
              >
                {property.address}
              </h3>
              <div
                className="flex items-center gap-1 text-sm mb-3"
                style={{ color: theme.textMuted }}
              >
                <MapPin className="h-3 w-3" />
                <span className="truncate">
                  {[property.city, property.state].filter(Boolean).join(", ")}
                </span>
              </div>

              {/* Price */}
              <div
                className="flex items-center gap-1 text-lg font-semibold mb-3"
                style={{ color: theme.accent }}
              >
                <DollarSign className="h-4 w-4" />
                {formatCurrency(property.price).replace("$", "")}
              </div>

              {/* Footer */}
              <div
                className="flex items-center justify-between pt-3 text-xs"
                style={{
                  borderTop: `1px solid ${dividerColor}`,
                  color: theme.textMuted,
                }}
              >
                <span>
                  {property._count.deals} deal{property._count.deals !== 1 ? "s" : ""}
                </span>
                <span>{formatDate(property.updatedAt)}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
