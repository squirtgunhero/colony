"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Search,
  MapPin,
  Upload,
  X,
  Loader2,
  Sparkles,
  List,
} from "lucide-react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { formatCurrency } from "@/lib/date-utils";

const PropertyMap = dynamic(() => import("./property-map"), { ssr: false });

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
  latitude?: number | null;
  longitude?: number | null;
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

export function PropertiesPage({ properties }: PropertiesPageProps) {
  const { theme } = useColonyTheme();
  const router = useRouter();

  // Search state
  const [addressQuery, setAddressQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searchError, setSearchError] = useState("");
  const [addingProperty, setAddingProperty] = useState(false);

  // Usage
  const [usage, setUsage] = useState<{ remaining: number; used: number } | null>(null);

  // UI state
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvStatus, setCsvStatus] = useState("");

  const dividerColor = withAlpha(theme.text, 0.06);

  useEffect(() => {
    fetch("/api/properties/usage")
      .then((r) => r.json())
      .then(setUsage)
      .catch(() => {});
  }, []);

  async function handleSearch() {
    if (!addressQuery.trim() || addressQuery.trim().length < 5) return;
    setSearching(true);
    setSearchResult(null);
    setSearchError("");
    try {
      const res = await fetch("/api/properties/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addressQuery }),
      });
      const data = await res.json();
      if (data.error) {
        setSearchError(data.error);
      } else if (data.property) {
        setSearchResult(data.property);
      } else {
        setSearchError("No property data found for this address");
      }
      if (data.usage) setUsage(data.usage);
    } catch {
      setSearchError("Search failed — please try again");
    } finally {
      setSearching(false);
    }
  }

  async function handleAddFromSearch() {
    if (!searchResult) return;
    setAddingProperty(true);
    try {
      const res = await fetch("/api/properties/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addressQuery, save: true }),
      });
      const data = await res.json();
      if (!data.error) {
        router.refresh();
        setSearchResult(null);
        setAddressQuery("");
      }
    } catch {
      // ignore
    } finally {
      setAddingProperty(false);
    }
  }

  async function handleCsvImport() {
    if (!csvFile) return;
    setCsvImporting(true);
    setCsvStatus("");
    try {
      const formData = new FormData();
      formData.append("file", csvFile);
      const res = await fetch("/api/properties/import", { method: "POST", body: formData });
      const data = await res.json();
      setCsvStatus(data.error ? `Error: ${data.error}` : `Imported ${data.created ?? 0} properties${data.skipped ? `, ${data.skipped} skipped` : ""}`);
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

  const handleSelectProperty = useCallback((id: string | null) => {
    setSelectedPropertyId(id);
    setShowSidebar(true);
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Search Bar */}
      <div
        className="px-4 py-3 flex items-center gap-3 flex-shrink-0"
        style={{ borderBottom: `1px solid ${dividerColor}` }}
      >
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
            style={{ color: theme.textMuted }}
          />
          <input
            placeholder="Search any address... (e.g. 123 Main St, Austin TX)"
            value={addressQuery}
            onChange={(e) => setAddressQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full h-10 pl-9 pr-3 rounded-xl text-sm outline-none transition-all"
            style={{
              backgroundColor: withAlpha(theme.text, 0.04),
              border: `1px solid ${dividerColor}`,
              color: theme.text,
              caretColor: theme.accent,
              fontFamily: "'DM Sans', sans-serif",
            }}
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searching || !addressQuery.trim()}
          className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
          style={{ backgroundColor: theme.accent, color: theme.bg }}
        >
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Lookup
        </button>
        <button
          onClick={() => setShowImport(!showImport)}
          className="px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2"
          style={{
            backgroundColor: showImport ? withAlpha(theme.accent, 0.15) : theme.bgGlow,
            color: showImport ? theme.accent : theme.textMuted,
          }}
        >
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">Import</span>
        </button>
        {usage && (
          <span className="text-xs whitespace-nowrap hidden md:block" style={{ color: theme.textMuted }}>
            {usage.remaining.toLocaleString()} lookups left
          </span>
        )}
      </div>

      {/* Search Result Bar */}
      {(searchResult || searchError) && (
        <div
          className="px-4 py-3 flex-shrink-0"
          style={{ borderBottom: `1px solid ${dividerColor}`, backgroundColor: withAlpha(theme.accent, 0.03) }}
        >
          {searchError ? (
            <div className="flex items-center justify-between">
              <p className="text-sm" style={{ color: "#ef4444" }}>{searchError}</p>
              <button onClick={() => setSearchError("")}>
                <X className="h-4 w-4" style={{ color: theme.textMuted }} />
              </button>
            </div>
          ) : searchResult && (
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 flex-shrink-0" style={{ color: theme.accent }} />
                  <span className="font-medium text-sm truncate" style={{ color: theme.text }}>
                    {searchResult.address}{searchResult.city ? `, ${searchResult.city}` : ""}{searchResult.state ? ` ${searchResult.state}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs flex-wrap" style={{ color: theme.textMuted }}>
                  {searchResult.ownerName && <span>Owner: {searchResult.ownerName}</span>}
                  {searchResult.assessedValue != null && <span>Assessed: {formatCurrency(searchResult.assessedValue)}</span>}
                  {searchResult.yearBuilt && <span>Built {searchResult.yearBuilt}</span>}
                  {searchResult.bedrooms != null && <span>{searchResult.bedrooms} bd</span>}
                  {searchResult.bathrooms != null && <span>{searchResult.bathrooms} ba</span>}
                  {searchResult.sqft != null && <span>{searchResult.sqft.toLocaleString()} sqft</span>}
                  {searchResult.lastSalePrice != null && <span>Last sale: {formatCurrency(searchResult.lastSalePrice)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddFromSearch}
                  disabled={addingProperty}
                  className="px-4 py-1.5 rounded-full text-xs font-medium transition-all disabled:opacity-50"
                  style={{ backgroundColor: theme.accent, color: theme.bg }}
                >
                  {addingProperty ? "Adding..." : "Add to Properties"}
                </button>
                <button onClick={() => { setSearchResult(null); setAddressQuery(""); }}>
                  <X className="h-4 w-4" style={{ color: theme.textMuted }} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CSV Import Bar */}
      {showImport && (
        <div
          className="px-4 py-3 flex items-center gap-3 flex-shrink-0"
          style={{ borderBottom: `1px solid ${dividerColor}`, backgroundColor: withAlpha(theme.text, 0.02) }}
        >
          <Upload className="h-4 w-4 flex-shrink-0" style={{ color: theme.accent }} />
          <span className="text-xs font-medium" style={{ color: theme.textMuted }}>PropWire / BatchLeads CSV:</span>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            className="text-xs flex-1"
            style={{ color: theme.textMuted }}
          />
          <button
            onClick={handleCsvImport}
            disabled={csvImporting || !csvFile}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all disabled:opacity-50"
            style={{ backgroundColor: theme.accent, color: theme.bg }}
          >
            {csvImporting ? "Importing..." : "Import"}
          </button>
          {csvStatus && <span className="text-xs" style={{ color: theme.textMuted }}>{csvStatus}</span>}
          <button onClick={() => { setShowImport(false); setCsvStatus(""); }}>
            <X className="h-4 w-4" style={{ color: theme.textMuted }} />
          </button>
        </div>
      )}

      {/* Map + Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map */}
        <div style={{ flex: 1, position: "relative" }}>
          <div style={{ position: "absolute", inset: 0 }}>
            <PropertyMap
              properties={properties}
              searchResult={searchResult}
              selectedId={selectedPropertyId}
              onSelectProperty={handleSelectProperty}
            />
          </div>

          {/* Toggle sidebar button */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="absolute top-3 left-3 z-[500] flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
            style={{
              backgroundColor: theme.bg,
              color: theme.text,
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            <List className="h-3.5 w-3.5" />
            {showSidebar ? "Hide" : "Show"} List ({properties.length})
          </button>

          {/* No map data message */}
          {properties.length > 0 && properties.filter((p) => p.latitude && p.longitude).length === 0 && (
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[400] text-center p-6 rounded-xl pointer-events-none"
              style={{ backgroundColor: withAlpha(theme.bg, 0.85), maxWidth: 300 }}
            >
              <MapPin className="h-8 w-8 mx-auto mb-3" style={{ color: theme.accent, opacity: 0.5 }} />
              <p className="text-sm font-medium mb-1" style={{ color: theme.text }}>No map data yet</p>
              <p className="text-xs" style={{ color: theme.textMuted }}>
                Search an address above to enrich properties with location data.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar — Property List */}
        {showSidebar && (
          <div
            className="w-[380px] flex-shrink-0 overflow-y-auto"
            style={{ borderLeft: `1px solid ${dividerColor}`, backgroundColor: theme.bg }}
          >
            <div className="p-3 space-y-1">
              {properties.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin className="h-10 w-10 mx-auto mb-3" style={{ color: theme.accent, opacity: 0.3 }} />
                  <p className="text-sm" style={{ color: theme.textMuted }}>No properties yet</p>
                  <p className="text-xs mt-1" style={{ color: theme.textMuted }}>Search an address above to get started</p>
                </div>
              ) : (
                properties.map((property) => {
                  const isSelected = property.id === selectedPropertyId;
                  const gradeColor = property.opportunityGrade
                    ? GRADE_COLORS[property.opportunityGrade] || theme.textMuted
                    : null;

                  return (
                    <Link
                      key={property.id}
                      href={`/properties/${property.id}`}
                      className="block p-3 rounded-lg transition-all duration-150"
                      style={{
                        backgroundColor: isSelected ? withAlpha(theme.accent, 0.08) : "transparent",
                        borderLeft: isSelected ? `3px solid ${theme.accent}` : "3px solid transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = withAlpha(theme.text, 0.04);
                        setSelectedPropertyId(property.id);
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-sm truncate" style={{ color: theme.text }}>
                            {property.address}
                          </h3>
                          <p className="text-xs truncate mt-0.5" style={{ color: theme.textMuted }}>
                            {[property.city, property.state, property.zipCode].filter(Boolean).join(", ")}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <div
                            className="h-1.5 w-1.5 rounded-full"
                            style={{
                              backgroundColor: property.melissaEnrichedAt ? "#22c55e" : withAlpha(theme.text, 0.15),
                            }}
                          />
                          {gradeColor && property.opportunityGrade && (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: withAlpha(gradeColor, 0.15), color: gradeColor }}
                            >
                              {property.opportunityGrade}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-sm font-semibold" style={{ color: theme.accent }}>
                          {formatCurrency(property.price)}
                        </span>
                        <span className="text-xs" style={{ color: theme.textMuted }}>
                          {[
                            property.bedrooms != null ? `${property.bedrooms} bd` : null,
                            property.bathrooms != null ? `${property.bathrooms} ba` : null,
                            property.sqft != null ? `${property.sqft.toLocaleString()} sqft` : null,
                          ].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                      {(property.ownerName || property.owner?.name) && (
                        <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
                          {property.ownerName || property.owner?.name}
                        </p>
                      )}
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Leaflet styles */}
      <style jsx global>{`
        .leaflet-container {
          background: #f0ede8 !important;
        }
        .leaflet-control-attribution {
          background: rgba(255,255,255,0.8) !important;
          color: rgba(0,0,0,0.5) !important;
          font-size: 10px !important;
        }
        .leaflet-control-attribution a {
          color: rgba(0,0,0,0.6) !important;
        }
        .leaflet-control-zoom a {
          background: rgba(255,255,255,0.95) !important;
          color: #333 !important;
          border-color: rgba(0,0,0,0.1) !important;
        }
      `}</style>
    </div>
  );
}
