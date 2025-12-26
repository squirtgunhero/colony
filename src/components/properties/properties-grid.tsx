"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PropertyDialog } from "./property-dialog";
import { deleteProperty } from "@/app/(dashboard)/properties/actions";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Search,
  MapPin,
  Bed,
  Bath,
  Square,
  Building2,
} from "lucide-react";
import { formatCurrency } from "@/lib/date-utils";
import { FavoritePropertyButton } from "@/components/favorites/favorite-property-button";

interface Property {
  id: string;
  address: string;
  city: string;
  state: string | null;
  zipCode: string | null;
  price: number;
  status: string;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  description: string | null;
  imageUrl: string | null;
  isFavorite: boolean;
  owner: { id: string; name: string } | null;
}

interface Contact {
  id: string;
  name: string;
}

interface PropertiesGridProps {
  properties: Property[];
  contacts: Contact[];
}

const statusColors: Record<string, string> = {
  pre_listing: "bg-purple-500/20 text-purple-400",
  listed: "bg-green-500/20 text-green-400",
  available: "bg-green-500/20 text-green-400", // Legacy fallback
  under_contract: "bg-amber-500/20 text-amber-400",
  sold: "bg-blue-500/20 text-blue-400",
  off_market: "bg-gray-500/20 text-gray-400",
};

const statusLabels: Record<string, string> = {
  pre_listing: "Pre-Listing",
  listed: "Listed",
  available: "Listed", // Legacy fallback
  under_contract: "Under Contract",
  sold: "Sold",
  off_market: "Off Market",
};

export function PropertiesGrid({ properties, contacts }: PropertiesGridProps) {
  const [search, setSearch] = useState("");

  const filteredProperties = properties.filter(
    (property) =>
      property.address.toLowerCase().includes(search.toLowerCase()) ||
      property.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search properties..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grid */}
      {filteredProperties.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-border">
          <div className="text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-2 text-muted-foreground">No properties found</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProperties.map((property) => (
            <Card key={property.id} className="overflow-hidden group">
              {/* Image Placeholder */}
              <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Building2 className="h-16 w-16 text-primary/30" />
                <div className="absolute top-3 right-3 flex items-center gap-1">
                  <FavoritePropertyButton
                    propertyId={property.id}
                    isFavorite={property.isFavorite}
                    className="h-8 w-8 bg-card/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <PropertyDialog property={property} contacts={contacts}>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      </PropertyDialog>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={async () => {
                          await deleteProperty(property.id);
                          toast.success("Property deleted", {
                            description: `${property.address} has been removed.`,
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="absolute top-3 left-3">
                  <Badge
                    variant="secondary"
                    className={statusColors[property.status] || ""}
                  >
                    {statusLabels[property.status] || property.status}
                  </Badge>
                </div>
              </div>

              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <Link 
                      href={`/properties/${property.id}`}
                      className="font-semibold text-lg line-clamp-1 hover:text-primary hover:underline transition-colors"
                    >
                      {property.address}
                    </Link>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>
                        {property.city}
                        {property.state && `, ${property.state}`}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(property.price)}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {property.bedrooms !== null && (
                    <div className="flex items-center gap-1">
                      <Bed className="h-4 w-4" />
                      <span>{property.bedrooms} bd</span>
                    </div>
                  )}
                  {property.bathrooms !== null && (
                    <div className="flex items-center gap-1">
                      <Bath className="h-4 w-4" />
                      <span>{property.bathrooms} ba</span>
                    </div>
                  )}
                  {property.sqft !== null && (
                    <div className="flex items-center gap-1">
                      <Square className="h-4 w-4" />
                      <span>{property.sqft.toLocaleString()} sqft</span>
                    </div>
                  )}
                </div>

                {property.owner && (
                  <p className="text-xs text-muted-foreground">
                    Owner: {property.owner.name}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

