"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  MapPin,
  DollarSign,
  Bed,
  Bath,
  Maximize,
  Upload,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  Sparkles,
  Building2,
  List,
  Map as MapIcon,
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

// ============================================================================
// Leaflet Map Component (loaded dynamically to avoid SSR issues)
// ============================================================================

function PropertyMap({
  properties,
  searchResult,
  selectedId,
  onSelectProperty,
}: {
  properties: Property[];
  searchResult: any;
  selectedId: string | null;
  onSelectProperty: (id: string | null) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const { theme } = useColonyTheme();

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Dynamically import Leaflet to avoid SSR
    import("leaflet").then((L) => {
      // Fix default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        zoomControl: false,
      }).setView([39.8283, -98.5795], 4); // Center US

      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Dark tile layer
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Add CSS for leaflet
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when properties or search result change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      const map = mapInstanceRef.current;

      // Clear existing markers
      markersRef.current.forEach((m) => map.removeLayer(m));
      markersRef.current = [];

      const bounds: [number, number][] = [];

      // Add property markers
      properties.forEach((p) => {
        if (!p.latitude || !p.longitude) return;
        const isSelected = p.id === selectedId;
        const gradeColor = p.opportunityGrade ? GRADE_COLORS[p.opportunityGrade] || theme.accent : theme.accent;

        const icon = L.divIcon({
          className: "custom-marker",
          html: `<div style="
            width: ${isSelected ? "32px" : "24px"};
            height: ${isSelected ? "32px" : "24px"};
            border-radius: 50%;
            background: ${gradeColor};
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 700;
            color: white;
            transition: all 0.2s;
            cursor: pointer;
          ">${p.opportunityGrade || ""}</div>`,
          iconSize: [isSelected ? 32 : 24, isSelected ? 32 : 24],
          iconAnchor: [isSelected ? 16 : 12, isSelected ? 16 : 12],
        });

        const marker = L.marker([p.latitude, p.longitude], { icon })
          .addTo(map)
          .on("click", () => onSelectProperty(p.id));

        marker.bindPopup(
          `<div style="font-family: 'DM Sans', sans-serif; color: #1a1a1a; min-width: 180px;">
            <strong style="font-size: 13px;">${p.address}</strong><br/>
            <span style="font-size: 12px; color: #666;">${[p.city, p.state].filter(Boolean).join(", ")}</span><br/>
            <span style="font-size: 14px; font-weight: 600; color: #1a1a1a;">${formatCurrency(p.price)}</span>
            ${p.bedrooms || p.bathrooms || p.sqft ? `<br/><span style="font-size: 11px; color: #888;">${[p.bedrooms ? `${p.bedrooms} bd` : "", p.bathrooms ? `${p.bathrooms} ba` : "", p.sqft ? `${p.sqft.toLocaleString()} sqft` : ""].filter(Boolean).join(" · ")}</span>` : ""}
          </div>`,
          { closeButton: false }
        );

        markersRef.current.push(marker);
        bounds.push([p.latitude, p.longitude]);
      });

      // Add search result marker
      if (searchResult?.latitude && searchResult?.longitude) {
        const icon = L.divIcon({
          className: "search-marker",
          html: `<div style="
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: ${theme.accent};
            border: 3px solid white;
            box-shadow: 0 0 16px ${withAlpha(theme.accent, 0.5)};
            display: flex;
            align-items: center;
            justify-content: center;
            animation: pulse 2s infinite;
          "><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([searchResult.latitude, searchResult.longitude], { icon }).addTo(map);
        markersRef.current.push(marker);
        bounds.push([searchResult.latitude, searchResult.longitude]);

        // Fly to search result
        map.flyTo([searchResult.latitude, searchResult.longitude], 15, { duration: 1 });
      } else if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    });
  }, [properties, searchResult, selectedId, theme.accent, onSelectProperty]);

  return (
    <div ref={mapRef} className="w-full h-full rounded-xl" style={{ minHeight: "100%" }} />
  );
}

// ============================================================================
// Main Properties Page
// ============================================================================

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

  const selectedProperty = selectedPropertyId
    ? properties.find((p) => p.id === selectedPropertyId)
    : null;

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
          <span
            className="text-xs whitespace-nowrap hidden md:block"
            style={{ color: theme.textMuted }}
          >
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
                <div className="flex items-center gap-4 mt-1 text-xs" style={{ color: theme.textMuted }}>
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
      <div className="flex-1 flex overflow-hidden relative">
        {/* Map */}
        <div className="flex-1 relative">
          <PropertyMap
            properties={properties}
            searchResult={searchResult}
            selectedId={selectedPropertyId}
            onSelectProperty={handleSelectProperty}
          />

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

          {/* Property count with no coords message */}
          {properties.length > 0 && properties.filter((p) => p.latitude && p.longitude).length === 0 && (
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[500] text-center p-6 rounded-xl"
              style={{ backgroundColor: withAlpha(theme.bg, 0.9), maxWidth: 320 }}
            >
              <MapPin className="h-8 w-8 mx-auto mb-3" style={{ color: theme.accent, opacity: 0.5 }} />
              <p className="text-sm font-medium mb-1" style={{ color: theme.text }}>No map data yet</p>
              <p className="text-xs" style={{ color: theme.textMuted }}>
                Search an address above to enrich properties with location data, or enrich existing properties from their detail page.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar — Property List */}
        {showSidebar && (
          <div
            className="w-[380px] flex-shrink-0 overflow-y-auto border-l"
            style={{ borderColor: dividerColor, backgroundColor: theme.bg }}
          >
            <div className="p-3 space-y-2">
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
                          {/* Enrichment dot */}
                          <div
                            className="h-1.5 w-1.5 rounded-full"
                            style={{
                              backgroundColor: property.melissaEnrichedAt ? "#22c55e" : withAlpha(theme.text, 0.15),
                            }}
                          />
                          {/* Grade badge */}
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
                          ]
                            .filter(Boolean)
                            .join(" · ")}
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

      {/* Pulse animation style */}
      <style jsx global>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
        }
        .leaflet-container {
          background: #1a1a2e !important;
        }
      `}</style>
    </div>
  );
}
