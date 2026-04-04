"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Home,
  MapPin,
  DollarSign,
  Bed,
  Bath,
  Maximize,
  Upload,
  Plus,
  FileSpreadsheet,
  Sparkles,
  Building2,
} from "lucide-react";
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
  bedrooms?: number | null;
  bathrooms?: number | null;
  sqft?: number | null;
  updatedAt: Date;
  owner?: { id: string; name: string } | null;
  _count: { deals: number };
  propertyType?: string | null;
  yearBuilt?: number | null;
  ownerName?: string | null;
  assessedValue?: number | null;
  marketValue?: number | null;
  opportunityScore?: number | null;
  opportunityGrade?: string | null;
  melissaEnrichedAt?: Date | null;
  importSource?: string | null;
}

interface PropertiesPageProps {
  properties: Property[];
}

const GRADE_COLORS: Record<string, string> = {
  A: "#22c55e",
  B: "#3b82f6",
  C: "#eab308",
  D: "#f97316",
  F: "#ef4444",
};

type SortOption = "newest" | "opportunity" | "price-high" | "price-low";

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest",
  opportunity: "Opportunity Score",
  "price-high": "Price High-Low",
  "price-low": "Price Low-High",
};

export function PropertiesPage({ properties }: PropertiesPageProps) {
  const { theme } = useColonyTheme();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);

  // Melissa usage
  const [melissaUsage, setMelissaUsage] = useState<{ remaining: number } | null>(null);
  useEffect(() => {
    fetch("/api/properties/usage")
      .then((r) => r.json())
      .then((data) => setMelissaUsage(data))
      .catch(() => {});
  }, []);

  // Address search state
  const [addressQuery, setAddressQuery] = useState("");
  const [addressSearching, setAddressSearching] = useState(false);
  const [addressResult, setAddressResult] = useState<any>(null);
  const [addressAdding, setAddressAdding] = useState(false);

  // CSV import state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvStatus, setCsvStatus] = useState("");

  const dividerColor = withAlpha(theme.text, 0.06);

  // Filter and sort
  const filteredProperties = properties
    .filter((property) => {
      const matchesSearch = property.address.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || property.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "opportunity":
          return (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0);
        case "price-high":
          return b.price - a.price;
        case "price-low":
          return a.price - b.price;
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

  const statuses = ["all", ...new Set(properties.map((p) => p.status))];

  async function handleAddressSearch() {
    if (!addressQuery.trim()) return;
    setAddressSearching(true);
    setAddressResult(null);
    try {
      const res = await fetch("/api/properties/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addressQuery }),
      });
      const data = await res.json();
      setAddressResult(data);
    } catch {
      setAddressResult({ error: "Search failed" });
    } finally {
      setAddressSearching(false);
    }
  }

  async function handleAddProperty() {
    if (!addressResult || addressResult.error) return;
    setAddressAdding(true);
    try {
      await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addressResult),
      });
      router.refresh();
      setAddressResult(null);
      setAddressQuery("");
      setShowAddressSearch(false);
    } catch {
      // ignore
    } finally {
      setAddressAdding(false);
    }
  }

  async function handleCsvImport() {
    if (!csvFile) return;
    setCsvImporting(true);
    setCsvStatus("");
    try {
      const formData = new FormData();
      formData.append("file", csvFile);
      const res = await fetch("/api/properties/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setCsvStatus(
        data.error
          ? `Error: ${data.error}`
          : `Imported ${data.imported ?? 0} properties${data.skipped ? `, ${data.skipped} skipped` : ""}`
      );
      if (!data.error) {
        router.refresh();
        setCsvFile(null);
      }
    } catch {
      setCsvStatus("Import failed");
    } finally {
      setCsvImporting(false);
    }
  }

  const inputStyle = {
    backgroundColor: "rgba(255,255,255,0.03)",
    boxShadow: "none",
    border: `1px solid ${dividerColor}`,
    color: theme.text,
    caretColor: theme.accent,
    fontFamily: "'DM Sans', sans-serif",
  };

  const buttonPrimary = {
    backgroundColor: theme.accent,
    color: theme.bg,
    boxShadow: "none",
  };

  const buttonSecondary = {
    backgroundColor: theme.bgGlow,
    color: theme.textMuted,
    boxShadow: "none",
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1
            className="text-[28px] leading-tight font-semibold tracking-[-0.01em]"
            style={{ color: theme.text, fontFamily: "'Manrope', var(--font-inter), sans-serif" }}
          >
            Properties
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: theme.textMuted, fontFamily: "'DM Sans', sans-serif" }}
          >
            {filteredProperties.length} propert{filteredProperties.length !== 1 ? "ies" : "y"}
          </p>
          {melissaUsage && (
            <p
              className="text-xs mt-1"
              style={{ color: theme.textMuted, fontFamily: "'DM Sans', sans-serif" }}
            >
              {melissaUsage.remaining} / 1,000 lookups remaining
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setShowAddressSearch(!showAddressSearch);
              setShowCsvImport(false);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200"
            style={showAddressSearch ? { ...buttonSecondary, backgroundColor: withAlpha(theme.accent, 0.15), color: theme.accent } : buttonSecondary}
          >
            <Search className="h-4 w-4" />
            Search Address
          </button>
          <button
            onClick={() => {
              setShowCsvImport(!showCsvImport);
              setShowAddressSearch(false);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200"
            style={showCsvImport ? { ...buttonSecondary, backgroundColor: withAlpha(theme.accent, 0.15), color: theme.accent } : buttonSecondary}
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
          <Link
            href="/browse/properties/new"
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
            style={buttonPrimary}
          >
            <Plus className="h-4 w-4" />
            Add Property
          </Link>
        </div>
      </div>

      {/* Address Search Panel */}
      {showAddressSearch && (
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ backgroundColor: theme.bgGlow, boxShadow: "none" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-4 w-4" style={{ color: theme.accent }} />
            <h3
              className="text-sm font-semibold uppercase tracking-wide"
              style={{ color: theme.textMuted }}
            >
              Melissa Address Lookup
            </h3>
          </div>
          <div className="flex gap-3">
            <input
              placeholder="Enter a property address to look up..."
              value={addressQuery}
              onChange={(e) => setAddressQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddressSearch()}
              className="flex-1 h-10 px-3 rounded-xl text-sm outline-none transition-all"
              style={inputStyle}
            />
            <button
              onClick={handleAddressSearch}
              disabled={addressSearching || !addressQuery.trim()}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 disabled:opacity-50"
              style={buttonPrimary}
            >
              {addressSearching ? "Searching..." : "Search"}
            </button>
          </div>

          {addressResult && !addressResult.error && (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ backgroundColor: withAlpha(theme.text, 0.03) }}
            >
              <h4 className="font-medium text-sm" style={{ color: theme.text }}>
                {addressResult.address || "Property Found"}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                {addressResult.ownerName && (
                  <div>
                    <span style={{ color: theme.textMuted }}>Owner: </span>
                    <span style={{ color: theme.text }}>{addressResult.ownerName}</span>
                  </div>
                )}
                {addressResult.assessedValue != null && (
                  <div>
                    <span style={{ color: theme.textMuted }}>Assessed: </span>
                    <span style={{ color: theme.text }}>{formatCurrency(addressResult.assessedValue)}</span>
                  </div>
                )}
                {addressResult.marketValue != null && (
                  <div>
                    <span style={{ color: theme.textMuted }}>Market: </span>
                    <span style={{ color: theme.text }}>{formatCurrency(addressResult.marketValue)}</span>
                  </div>
                )}
                {addressResult.yearBuilt && (
                  <div>
                    <span style={{ color: theme.textMuted }}>Year Built: </span>
                    <span style={{ color: theme.text }}>{addressResult.yearBuilt}</span>
                  </div>
                )}
                {addressResult.bedrooms != null && (
                  <div>
                    <span style={{ color: theme.textMuted }}>Beds: </span>
                    <span style={{ color: theme.text }}>{addressResult.bedrooms}</span>
                  </div>
                )}
                {addressResult.bathrooms != null && (
                  <div>
                    <span style={{ color: theme.textMuted }}>Baths: </span>
                    <span style={{ color: theme.text }}>{addressResult.bathrooms}</span>
                  </div>
                )}
                {addressResult.sqft != null && (
                  <div>
                    <span style={{ color: theme.textMuted }}>Sqft: </span>
                    <span style={{ color: theme.text }}>{addressResult.sqft.toLocaleString()}</span>
                  </div>
                )}
                {addressResult.lotSize && (
                  <div>
                    <span style={{ color: theme.textMuted }}>Lot: </span>
                    <span style={{ color: theme.text }}>{addressResult.lotSize}</span>
                  </div>
                )}
                {addressResult.zoning && (
                  <div>
                    <span style={{ color: theme.textMuted }}>Zoning: </span>
                    <span style={{ color: theme.text }}>{addressResult.zoning}</span>
                  </div>
                )}
                {addressResult.lastSaleDate && (
                  <div>
                    <span style={{ color: theme.textMuted }}>Last Sale: </span>
                    <span style={{ color: theme.text }}>
                      {formatDate(addressResult.lastSaleDate)}
                      {addressResult.lastSalePrice != null && ` (${formatCurrency(addressResult.lastSalePrice)})`}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={handleAddProperty}
                disabled={addressAdding}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 disabled:opacity-50"
                style={buttonPrimary}
              >
                {addressAdding ? "Adding..." : "Add to Properties"}
              </button>
            </div>
          )}

          {addressResult?.error && (
            <p className="text-sm" style={{ color: "#ef4444" }}>
              {addressResult.error}
            </p>
          )}
        </div>
      )}

      {/* CSV Import Panel */}
      {showCsvImport && (
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ backgroundColor: theme.bgGlow, boxShadow: "none" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <FileSpreadsheet className="h-4 w-4" style={{ color: theme.accent }} />
            <h3
              className="text-sm font-semibold uppercase tracking-wide"
              style={{ color: theme.textMuted }}
            >
              Import CSV
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              className="text-sm"
              style={{ color: theme.textMuted }}
            />
            <button
              onClick={handleCsvImport}
              disabled={csvImporting || !csvFile}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 disabled:opacity-50"
              style={buttonPrimary}
            >
              {csvImporting ? "Importing..." : "Import"}
            </button>
          </div>
          {csvStatus && (
            <p className="text-sm" style={{ color: theme.textMuted }}>
              {csvStatus}
            </p>
          )}
        </div>
      )}

      {/* Sort + Filters */}
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
            style={inputStyle}
          />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
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
                  boxShadow: "none",
                }}
              >
                {(status ?? "").replace("_", " ")}
              </button>
            );
          })}
          <div className="w-px h-5 mx-1" style={{ backgroundColor: dividerColor }} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="h-8 px-2 rounded-lg text-sm outline-none"
            style={{
              backgroundColor: "transparent",
              color: theme.textMuted,
              border: `1px solid ${dividerColor}`,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
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
          filteredProperties.map((property) => {
            const gradeColor = property.opportunityGrade
              ? GRADE_COLORS[property.opportunityGrade] || theme.textMuted
              : null;

            return (
              <Link
                key={property.id}
                href={`/properties/${property.id}`}
                className="flex flex-col p-4 rounded-xl transition-all duration-200 group relative"
                style={{
                  backgroundColor: theme.bgGlow,
                  boxShadow: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `2px 2px 4px rgba(0,0,0,0.3), -2px -2px 4px rgba(255,255,255,0.03), 0 0 12px ${withAlpha(theme.accent, 0.1)}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Opportunity Grade Badge */}
                {gradeColor && property.opportunityGrade && (
                  <div
                    className="absolute top-3 right-3 flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: withAlpha(gradeColor, 0.15),
                      color: gradeColor,
                    }}
                  >
                    {property.opportunityGrade}
                  </div>
                )}

                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="flex items-center justify-center h-10 w-10 rounded-lg"
                    style={{ backgroundColor: withAlpha(theme.accent, 0.15) }}
                  >
                    <Home className="h-5 w-5" style={{ color: theme.accent }} />
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Enrichment dot */}
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: property.melissaEnrichedAt ? "#22c55e" : withAlpha(theme.text, 0.2),
                      }}
                      title={property.melissaEnrichedAt ? "Enriched" : "Not enriched"}
                    />
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
                </div>

                {/* Address */}
                <h3
                  className="font-medium mb-1 truncate pr-8"
                  style={{ color: theme.text }}
                >
                  {property.address}
                </h3>
                <div
                  className="flex items-center gap-1 text-sm mb-3"
                  style={{ color: theme.textMuted }}
                >
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">
                    {[property.city, property.state].filter(Boolean).join(", ")}
                  </span>
                </div>

                {/* Property Type + Year Built */}
                {(property.propertyType || property.yearBuilt) && (
                  <div
                    className="flex items-center gap-2 text-xs mb-2"
                    style={{ color: theme.textMuted }}
                  >
                    {property.propertyType && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {property.propertyType}
                      </span>
                    )}
                    {property.yearBuilt && (
                      <span>Built {property.yearBuilt}</span>
                    )}
                  </div>
                )}

                {/* Price */}
                <div
                  className="flex items-center gap-1 text-lg font-semibold mb-2"
                  style={{ color: theme.accent }}
                >
                  <DollarSign className="h-4 w-4" />
                  {formatCurrency(property.price).replace("$", "")}
                </div>

                {/* Property details */}
                {(property.bedrooms || property.bathrooms || property.sqft) && (
                  <div
                    className="flex items-center gap-3 text-xs mb-3"
                    style={{ color: theme.textMuted }}
                  >
                    {property.bedrooms != null && (
                      <span className="flex items-center gap-1">
                        <Bed className="h-3 w-3" /> {property.bedrooms} bd
                      </span>
                    )}
                    {property.bathrooms != null && (
                      <span className="flex items-center gap-1">
                        <Bath className="h-3 w-3" /> {property.bathrooms} ba
                      </span>
                    )}
                    {property.sqft != null && (
                      <span className="flex items-center gap-1">
                        <Maximize className="h-3 w-3" /> {property.sqft.toLocaleString()} sqft
                      </span>
                    )}
                  </div>
                )}

                {/* Owner */}
                {(property.owner || property.ownerName) && (
                  <div
                    className="text-xs mb-3"
                    style={{ color: theme.textMuted }}
                  >
                    Owner:{" "}
                    <span style={{ color: theme.text }}>
                      {property.owner?.name || property.ownerName}
                    </span>
                  </div>
                )}

                {/* Footer */}
                <div
                  className="flex items-center justify-between pt-3 text-xs mt-auto"
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
            );
          })
        )}
      </div>
    </div>
  );
}
