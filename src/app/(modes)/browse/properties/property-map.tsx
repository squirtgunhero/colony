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
}

interface PropertyMapProps {
  properties: MapProperty[];
  searchResult: any;
  selectedId: string | null;
  onSelectProperty: (id: string | null) => void;
}

export default function PropertyMap({
  properties,
  searchResult,
  selectedId,
  onSelectProperty,
}: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const { theme } = useColonyTheme();

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
    }).setView([39.8283, -98.5795], 4);

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

  // Update markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    const bounds: L.LatLngTuple[] = [];

    // Property markers
    properties.forEach((p) => {
      if (!p.latitude || !p.longitude) return;
      const isSelected = p.id === selectedId;
      const gradeColor = p.opportunityGrade ? GRADE_COLORS[p.opportunityGrade] || theme.accent : theme.accent;
      const size = isSelected ? 32 : 24;

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:${size}px;height:${size}px;border-radius:50%;
          background:${gradeColor};border:2px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.4);
          display:flex;align-items:center;justify-content:center;
          font-size:10px;font-weight:700;color:white;cursor:pointer;
          transition:all 0.2s;
        ">${p.opportunityGrade || ""}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([p.latitude, p.longitude], { icon })
        .addTo(map)
        .on("click", () => onSelectProperty(p.id));

      marker.bindPopup(
        `<div style="font-family:'DM Sans',sans-serif;color:#1a1a1a;min-width:180px;">
          <strong style="font-size:13px;">${p.address}</strong><br/>
          <span style="font-size:12px;color:#666;">${[p.city, p.state].filter(Boolean).join(", ")}</span><br/>
          <span style="font-size:14px;font-weight:600;">${formatCurrency(p.price)}</span>
          ${p.bedrooms || p.bathrooms || p.sqft ? `<br/><span style="font-size:11px;color:#888;">${[p.bedrooms ? `${p.bedrooms} bd` : "", p.bathrooms ? `${p.bathrooms} ba` : "", p.sqft ? `${p.sqft.toLocaleString()} sqft` : ""].filter(Boolean).join(" · ")}</span>` : ""}
        </div>`,
        { closeButton: false }
      );

      markersRef.current.push(marker);
      bounds.push([p.latitude, p.longitude]);
    });

    // Search result marker
    if (searchResult?.latitude && searchResult?.longitude) {
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:36px;height:36px;border-radius:50%;
          background:${theme.accent};border:3px solid white;
          box-shadow:0 0 16px ${withAlpha(theme.accent, 0.5)};
          display:flex;align-items:center;justify-content:center;
        "><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([searchResult.latitude, searchResult.longitude], { icon }).addTo(map);
      markersRef.current.push(marker);
      bounds.push([searchResult.latitude, searchResult.longitude]);

      map.flyTo([searchResult.latitude, searchResult.longitude], 15, { duration: 1 });
    } else if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [properties, searchResult, selectedId, theme.accent, onSelectProperty]);

  return <div ref={mapRef} style={{ width: "100%", height: "100%" }} />;
}
