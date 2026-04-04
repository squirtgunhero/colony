"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { formatCurrency } from "@/lib/date-utils";

const GRADE_COLORS: Record<string, string> = {
  A: "#22c55e",
  B: "#3b82f6",
  C: "#eab308",
  D: "#f97316",
  F: "#ef4444",
};

// Fix Leaflet default icon paths (broken by webpack)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MapProperty {
  id: string;
  address: string;
  city?: string | null;
  state?: string | null;
  price: number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  sqft?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  opportunityGrade?: string | null;
  ownerName?: string | null;
  propertyType?: string | null;
  yearBuilt?: number | null;
}

interface PropertyMapProps {
  properties: MapProperty[];
  searchResult: any;
  selectedId: string | null;
  onSelectProperty: (id: string | null) => void;
  defaultCenter?: { lat: number; lng: number; zoom: number };
}

export default function PropertyMap({
  properties,
  searchResult,
  selectedId,
  onSelectProperty,
  defaultCenter,
}: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const searchMarkerRef = useRef<L.Marker | null>(null);
  const { theme } = useColonyTheme();

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
    }).setView(
      defaultCenter ? [defaultCenter.lat, defaultCenter.lng] : [39.8283, -98.5795],
      defaultCenter?.zoom ?? 4
    );

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    setTimeout(() => map.invalidateSize(), 50);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Resize map when container changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const timer = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 100);
    return () => clearTimeout(timer);
  }, [selectedId]);

  // Update property dot markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing property markers
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    const bounds: L.LatLngTuple[] = [];

    // Property dot markers
    properties.forEach((p) => {
      if (!p.latitude || !p.longitude) return;
      const isSelected = p.id === selectedId;
      const gradeColor = p.opportunityGrade
        ? GRADE_COLORS[p.opportunityGrade] || theme.accent
        : theme.accent;

      const circle = L.circleMarker([p.latitude, p.longitude], {
        radius: isSelected ? 10 : 7,
        fillColor: gradeColor,
        fillOpacity: isSelected ? 1 : 0.85,
        color: "white",
        weight: isSelected ? 3 : 2,
        className: `property-dot${isSelected ? " selected" : ""}`,
      }).addTo(map);

      // Build tooltip content
      const details = [
        p.bedrooms ? `${p.bedrooms} bd` : "",
        p.bathrooms ? `${p.bathrooms} ba` : "",
        p.sqft ? `${p.sqft.toLocaleString()} sqft` : "",
      ].filter(Boolean).join(" · ");

      const tooltipHtml = `
        <div class="property-tooltip">
          <div class="property-tooltip-address">${p.address}</div>
          <div class="property-tooltip-location">${[p.city, p.state].filter(Boolean).join(", ")}</div>
          <div class="property-tooltip-price">${formatCurrency(p.price)}</div>
          ${details ? `<div class="property-tooltip-details">${details}</div>` : ""}
          ${p.ownerName ? `<div class="property-tooltip-owner">${p.ownerName}</div>` : ""}
          ${p.opportunityGrade ? `<div class="property-tooltip-grade" style="color:${gradeColor}">Grade ${p.opportunityGrade}</div>` : ""}
        </div>
      `;

      circle.bindTooltip(tooltipHtml, {
        direction: "top",
        offset: [0, -10],
        className: "property-map-tooltip",
        opacity: 1,
      });

      circle.on("click", () => onSelectProperty(p.id));

      // Enlarge on hover
      circle.on("mouseover", () => {
        circle.setRadius(12);
        circle.setStyle({ weight: 3 });
      });
      circle.on("mouseout", () => {
        const sel = p.id === selectedId;
        circle.setRadius(sel ? 10 : 7);
        circle.setStyle({ weight: sel ? 3 : 2 });
      });

      markersRef.current.push(circle);
      bounds.push([p.latitude, p.longitude]);
    });

    // Only fit bounds for properties (not search), and only if no search result
    if (!searchResult && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [properties, selectedId, theme.accent, onSelectProperty, searchResult]);

  // Search result marker (separate effect so it doesn't clear property dots)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous search marker
    if (searchMarkerRef.current) {
      map.removeLayer(searchMarkerRef.current);
      searchMarkerRef.current = null;
    }

    if (searchResult?.latitude && searchResult?.longitude) {
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:36px;height:36px;border-radius:50%;
          background:${theme.accent};border:3px solid white;
          box-shadow:0 0 16px ${withAlpha(theme.accent, 0.5)};
          display:flex;align-items:center;justify-content:center;
          animation: pulse-marker 2s infinite;
        "><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      // Build search result tooltip
      const details = [
        searchResult.bedrooms ? `${searchResult.bedrooms} bd` : "",
        searchResult.bathrooms ? `${searchResult.bathrooms} ba` : "",
        searchResult.sqft ? `${searchResult.sqft.toLocaleString()} sqft` : "",
      ].filter(Boolean).join(" · ");

      const tooltipHtml = `
        <div class="property-tooltip">
          <div class="property-tooltip-address">${searchResult.address || "Search Result"}</div>
          <div class="property-tooltip-location">${[searchResult.city, searchResult.state].filter(Boolean).join(", ")}</div>
          ${searchResult.assessedValue ? `<div class="property-tooltip-price">${formatCurrency(searchResult.assessedValue)}</div>` : ""}
          ${details ? `<div class="property-tooltip-details">${details}</div>` : ""}
          ${searchResult.ownerName ? `<div class="property-tooltip-owner">${searchResult.ownerName}</div>` : ""}
        </div>
      `;

      const marker = L.marker([searchResult.latitude, searchResult.longitude], { icon })
        .addTo(map);

      marker.bindTooltip(tooltipHtml, {
        direction: "top",
        offset: [0, -20],
        className: "property-map-tooltip",
        opacity: 1,
      });

      searchMarkerRef.current = marker;

      map.flyTo([searchResult.latitude, searchResult.longitude], 15, { duration: 1 });
    }
  }, [searchResult, theme.accent]);

  return (
    <>
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
      <style>{`
        @keyframes pulse-marker {
          0%, 100% { box-shadow: 0 0 8px ${withAlpha(theme.accent, 0.4)}; }
          50% { box-shadow: 0 0 20px ${withAlpha(theme.accent, 0.7)}; }
        }
        .property-map-tooltip {
          background: #1a1a1a !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
          border-radius: 10px !important;
          padding: 0 !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important;
          font-family: 'DM Sans', sans-serif !important;
        }
        .property-map-tooltip .leaflet-tooltip-content {
          margin: 0 !important;
        }
        .property-map-tooltip::before {
          border-top-color: #1a1a1a !important;
        }
        .property-tooltip {
          padding: 10px 14px;
          min-width: 180px;
        }
        .property-tooltip-address {
          font-weight: 600;
          font-size: 13px;
          color: #ffffff;
          margin-bottom: 2px;
        }
        .property-tooltip-location {
          font-size: 11px;
          color: rgba(255,255,255,0.5);
          margin-bottom: 6px;
        }
        .property-tooltip-price {
          font-size: 15px;
          font-weight: 700;
          color: ${theme.accent};
          margin-bottom: 2px;
        }
        .property-tooltip-details {
          font-size: 11px;
          color: rgba(255,255,255,0.6);
        }
        .property-tooltip-owner {
          font-size: 11px;
          color: rgba(255,255,255,0.45);
          margin-top: 4px;
          font-style: italic;
        }
        .property-tooltip-grade {
          font-size: 11px;
          font-weight: 700;
          margin-top: 4px;
        }
      `}</style>
    </>
  );
}
