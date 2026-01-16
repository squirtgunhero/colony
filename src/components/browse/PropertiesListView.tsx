"use client";

// ============================================
// COLONY - Properties List View for Browse Mode
// ============================================

import { useState } from "react";
import Link from "next/link";
import { Search, Home, MapPin, DollarSign, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredProperties = properties.filter((property) => {
    const matchesSearch = property.address.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || property.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statuses = ["all", ...new Set(properties.map((p) => p.status))];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Properties</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredProperties.length} propert{filteredProperties.length !== 1 ? "ies" : "y"}
          </p>
        </div>
        <Button asChild>
          <Link href="/browse/properties/new">Add Property</Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search properties..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-lg capitalize transition-colors",
                statusFilter === status
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {status.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProperties.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Home className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p>No properties found</p>
          </div>
        ) : (
          filteredProperties.map((property) => (
            <Link
              key={property.id}
              href={`/properties/${property.id}`}
              className="flex flex-col p-4 rounded-xl bg-card border border-border/50 hover:border-border hover:shadow-sm transition-all group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                  <Home className="h-5 w-5 text-primary" />
                </div>
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full capitalize",
                  property.status === "active" && "bg-green-500/10 text-green-600 dark:text-green-400",
                  property.status === "pending" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                  property.status === "sold" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                  property.status === "off_market" && "bg-muted text-muted-foreground"
                )}>
                  {property.status.replace("_", " ")}
                </span>
              </div>

              {/* Address */}
              <h3 className="font-medium mb-1 truncate">{property.address}</h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                <MapPin className="h-3 w-3" />
                <span className="truncate">
                  {[property.city, property.state].filter(Boolean).join(", ")}
                </span>
              </div>

              {/* Price */}
              <div className="flex items-center gap-1 text-lg font-semibold text-primary mb-3">
                <DollarSign className="h-4 w-4" />
                {formatCurrency(property.price).replace("$", "")}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-border/50 text-xs text-muted-foreground">
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
