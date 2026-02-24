"use client";

// ============================================
// COLONY - Property Panel for Context Drawer
// Shows property details in drawer format
// ============================================

import { useEffect, useState } from "react";
import { Home, MapPin, DollarSign, Calendar, Bed, Bath, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";

interface Property {
  id: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  price: number;
  status: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
  contacts?: Array<{ id: string; name: string }>;
}

interface PropertyPanelProps {
  entityId?: string;
}

export function PropertyPanel({ entityId }: PropertyPanelProps) {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entityId) {
      setLoading(false);
      return;
    }

    async function fetchProperty() {
      try {
        const res = await fetch(`/api/properties/${entityId}`);
        if (res.ok) {
          const json = await res.json();
          setProperty(json);
        }
      } catch (error) {
        console.error("Failed to fetch property:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProperty();
  }, [entityId]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-40 bg-muted animate-pulse rounded-lg" />
        <div className="space-y-2">
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Home className="h-8 w-8 mx-auto mb-3 opacity-40" />
        <p>Property not found</p>
      </div>
    );
  }

  const fullAddress = [
    property.address,
    property.city,
    property.state,
    property.zipCode,
  ].filter(Boolean).join(", ");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-start gap-3 mb-3">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10">
            <Home className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{property.address}</h3>
            <p className="text-sm text-muted-foreground">
              {property.city && `${property.city}, `}
              {property.state} {property.zipCode}
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-primary">
            {formatCurrency(property.price)}
          </span>
          <span className={cn(
            "text-xs px-3 py-1 rounded-full capitalize",
            property.status === "active" && "bg-green-500/10 text-green-600 dark:text-green-400",
            property.status === "pending" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
            property.status === "sold" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
            property.status === "off_market" && "bg-muted text-muted-foreground"
          )}>
            {(property.status ?? "").replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Property Features */}
      {(property.bedrooms || property.bathrooms || property.squareFeet) && (
        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
          {property.bedrooms && (
            <div className="flex items-center gap-2">
              <Bed className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{property.bedrooms} bed</span>
            </div>
          )}
          {property.bathrooms && (
            <div className="flex items-center gap-2">
              <Bath className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{property.bathrooms} bath</span>
            </div>
          )}
          {property.squareFeet && (
            <div className="flex items-center gap-2">
              <Square className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {property.squareFeet.toLocaleString()} sqft
              </span>
            </div>
          )}
        </div>
      )}

      {/* Description */}
      {property.description && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Description
          </h4>
          <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
            {property.description}
          </p>
        </div>
      )}

      {/* Location */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
        <div>
          <p className="text-xs text-muted-foreground">Full Address</p>
          <p className="text-sm font-medium">{fullAddress}</p>
        </div>
      </div>

      {/* Related Contacts */}
      {property.contacts && property.contacts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Related Contacts ({property.contacts.length})
          </h4>
          <div className="space-y-2">
            {property.contacts.map((contact) => (
              <div 
                key={contact.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
              >
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {contact.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <span className="text-sm font-medium">{contact.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t border-border/50">
        <Calendar className="h-3.5 w-3.5" />
        <span>Added {formatDate(new Date(property.createdAt))}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button size="sm" variant="outline" className="flex-1">
          Edit
        </Button>
        <Button size="sm" className="flex-1">
          Create Deal
        </Button>
      </div>
    </div>
  );
}
