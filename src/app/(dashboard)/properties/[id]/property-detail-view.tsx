"use client";

import Link from "next/link";
import Image from "next/image";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { DocumentList } from "@/components/documents/document-list";
import { DocumentUploader } from "@/components/documents/document-uploader";
import { PropertyDialog } from "@/components/properties/property-dialog";
import { formatCurrency, formatDistanceToNow } from "@/lib/date-utils";
import {
  ArrowLeft,
  Pencil,
  MapPin,
  Bed,
  Bath,
  Square,
  DollarSign,
  User,
  Target,
  Calendar,
  Building,
} from "lucide-react";

interface PropertyDetailViewProps {
  property: any;
  contacts: any[];
}

const statusLabels: Record<string, string> = {
  available: "Available",
  under_contract: "Under Contract",
  sold: "Sold",
  off_market: "Off Market",
  pre_listing: "Pre-Listing",
};

export function PropertyDetailView({ property, contacts }: PropertyDetailViewProps) {
  const { theme } = useColonyTheme();

  const neumorphicRaised = `4px 4px 8px rgba(0,0,0,0.4), -4px -4px 8px rgba(255,255,255,0.04)`;
  const dividerColor = withAlpha(theme.text, 0.06);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${dividerColor}` }}>
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-start gap-4">
            <Link
              href="/properties"
              className="h-8 w-8 mt-1 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: theme.textMuted }}
              onMouseEnter={(e) => (e.currentTarget.style.color = theme.accent)}
              onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1
                  className="text-[28px] leading-tight font-semibold tracking-[-0.01em]"
                  style={{ color: theme.text, fontFamily: "'Spectral', serif" }}
                >
                  {property.address}
                </h1>
                <span
                  className="text-[11px] font-semibold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor: withAlpha(theme.accent, 0.15),
                    color: theme.accent,
                  }}
                >
                  {statusLabels[property.status] || property.status.replace("_", " ")}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1" style={{ color: theme.textMuted }}>
                <MapPin className="h-4 w-4" />
                <span>
                  {property.city}
                  {property.state && `, ${property.state}`}
                  {property.zipCode && ` ${property.zipCode}`}
                </span>
              </div>
            </div>
            <PropertyDialog property={property} contacts={contacts}>
              <button
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200"
                style={{
                  backgroundColor: theme.bgGlow,
                  color: theme.textMuted,
                  boxShadow: neumorphicRaised,
                }}
              >
                <Pencil className="h-4 w-4" style={{ color: theme.accent }} />
                Edit
              </button>
            </PropertyDialog>
          </div>

          {/* Property Stats */}
          <div className="flex flex-wrap gap-6 mt-6">
            <div className="flex items-center gap-2">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: withAlpha(theme.accent, 0.15) }}
              >
                <DollarSign className="h-5 w-5" style={{ color: theme.accent }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: theme.text }}>
                  {formatCurrency(property.price)}
                </p>
                <p className="text-xs" style={{ color: theme.textMuted }}>
                  Listing Price
                </p>
              </div>
            </div>
            {property.bedrooms && (
              <div className="flex items-center gap-2">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: withAlpha(theme.accent, 0.15) }}
                >
                  <Bed className="h-5 w-5" style={{ color: theme.accent }} />
                </div>
                <div>
                  <p className="text-xl font-semibold" style={{ color: theme.text }}>
                    {property.bedrooms}
                  </p>
                  <p className="text-xs" style={{ color: theme.textMuted }}>
                    Bedrooms
                  </p>
                </div>
              </div>
            )}
            {property.bathrooms && (
              <div className="flex items-center gap-2">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: withAlpha(theme.accent, 0.15) }}
                >
                  <Bath className="h-5 w-5" style={{ color: theme.accent }} />
                </div>
                <div>
                  <p className="text-xl font-semibold" style={{ color: theme.text }}>
                    {property.bathrooms}
                  </p>
                  <p className="text-xs" style={{ color: theme.textMuted }}>
                    Bathrooms
                  </p>
                </div>
              </div>
            )}
            {property.sqft && (
              <div className="flex items-center gap-2">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: withAlpha(theme.accent, 0.15) }}
                >
                  <Square className="h-5 w-5" style={{ color: theme.accent }} />
                </div>
                <div>
                  <p className="text-xl font-semibold" style={{ color: theme.text }}>
                    {property.sqft.toLocaleString()}
                  </p>
                  <p className="text-xs" style={{ color: theme.textMuted }}>
                    Sq Ft
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Image */}
            {property.imageUrl && (
              <div className="relative aspect-video w-full overflow-hidden rounded-xl"
                style={{ boxShadow: neumorphicRaised }}
              >
                <Image
                  src={property.imageUrl}
                  alt={property.address}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Description */}
            {property.description && (
              <div
                className="rounded-xl p-6"
                style={{
                  backgroundColor: theme.bgGlow,
                  boxShadow: neumorphicRaised,
                }}
              >
                <h3 className="text-lg font-semibold mb-3" style={{ color: theme.text }}>
                  Description
                </h3>
                <p
                  className="whitespace-pre-wrap text-sm leading-relaxed"
                  style={{ color: theme.textMuted }}
                >
                  {property.description}
                </p>
              </div>
            )}

            {/* Documents */}
            <DocumentList documents={property.documents} title="Property Documents" />

            {/* Document Uploader */}
            <DocumentUploader propertyId={property.id} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Owner */}
            {property.owner && (
              <div
                className="rounded-xl p-5"
                style={{
                  backgroundColor: theme.bgGlow,
                  boxShadow: neumorphicRaised,
                }}
              >
                <h3
                  className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2 mb-4"
                  style={{ color: theme.textMuted }}
                >
                  <User className="h-4 w-4" style={{ color: theme.accent }} />
                  Owner
                </h3>
                <Link
                  href={`/contacts/${property.owner.id}`}
                  className="flex items-center gap-3 p-3 -m-3 rounded-lg transition-colors"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = withAlpha(theme.text, 0.04);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full font-medium"
                    style={{
                      background: `linear-gradient(135deg, ${withAlpha(theme.accent, 0.2)}, ${withAlpha(theme.accent, 0.08)})`,
                      color: theme.accent,
                    }}
                  >
                    {property.owner.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm" style={{ color: theme.text }}>
                      {property.owner.name}
                    </p>
                    {property.owner.email && (
                      <p className="text-xs" style={{ color: theme.textMuted }}>
                        {property.owner.email}
                      </p>
                    )}
                  </div>
                </Link>
              </div>
            )}

            {/* Deals */}
            <div
              className="rounded-xl p-5"
              style={{
                backgroundColor: theme.bgGlow,
                boxShadow: neumorphicRaised,
              }}
            >
              <h3
                className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2 mb-4"
                style={{ color: theme.textMuted }}
              >
                <Target className="h-4 w-4" style={{ color: theme.accent }} />
                Deals
                <span className="font-normal" style={{ color: withAlpha(theme.text, 0.3) }}>
                  ({property.deals.length})
                </span>
              </h3>
              {property.deals.length === 0 ? (
                <p className="text-sm" style={{ color: theme.textMuted }}>
                  No deals yet
                </p>
              ) : (
                <div className="space-y-1">
                  {property.deals.map((deal: any) => (
                    <div
                      key={deal.id}
                      className="flex items-center justify-between py-2"
                      style={{ borderBottom: `1px solid ${dividerColor}` }}
                    >
                      <div>
                        <p className="text-sm font-medium" style={{ color: theme.text }}>
                          {deal.title}
                        </p>
                        <p className="text-xs" style={{ color: theme.textMuted }}>
                          {deal.contact?.name || "No contact"}
                        </p>
                      </div>
                      <div className="text-right">
                        {deal.value && (
                          <p className="text-sm font-medium" style={{ color: theme.text }}>
                            {formatCurrency(deal.value)}
                          </p>
                        )}
                        <p
                          className="text-xs capitalize"
                          style={{ color: theme.textMuted }}
                        >
                          {deal.stage.replace("_", " ")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Open Tasks */}
            {property.tasks.length > 0 && (
              <div
                className="rounded-xl p-5"
                style={{
                  backgroundColor: theme.bgGlow,
                  boxShadow: neumorphicRaised,
                }}
              >
                <h3
                  className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2 mb-4"
                  style={{ color: theme.textMuted }}
                >
                  <Calendar className="h-4 w-4" style={{ color: theme.accent }} />
                  Open Tasks
                </h3>
                <div className="space-y-3">
                  {property.tasks.map((task: any) => (
                    <div key={task.id} className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 mt-0.5" style={{ color: theme.accent }} />
                      <div>
                        <p className="text-sm" style={{ color: theme.text }}>
                          {task.title}
                        </p>
                        {task.dueDate && (
                          <p className="text-xs" style={{ color: theme.textMuted }}>
                            Due {formatDistanceToNow(task.dueDate)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Property Details */}
            <div
              className="rounded-xl p-5"
              style={{
                backgroundColor: theme.bgGlow,
                boxShadow: neumorphicRaised,
              }}
            >
              <h3
                className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2 mb-4"
                style={{ color: theme.textMuted }}
              >
                <Building className="h-4 w-4" style={{ color: theme.accent }} />
                Details
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: theme.textMuted }}>Status</span>
                  <span
                    className="text-[11px] font-semibold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: withAlpha(theme.accent, 0.15),
                      color: theme.accent,
                    }}
                  >
                    {statusLabels[property.status] || property.status.replace("_", " ")}
                  </span>
                </div>
                <div
                  className="flex items-center justify-between text-sm pt-3"
                  style={{ borderTop: `1px solid ${dividerColor}` }}
                >
                  <span style={{ color: theme.textMuted }}>Added</span>
                  <span style={{ color: theme.textSoft }}>
                    {formatDistanceToNow(property.createdAt)}
                  </span>
                </div>
                <div
                  className="flex items-center justify-between text-sm pt-3"
                  style={{ borderTop: `1px solid ${dividerColor}` }}
                >
                  <span style={{ color: theme.textMuted }}>Last Updated</span>
                  <span style={{ color: theme.textSoft }}>
                    {formatDistanceToNow(property.updatedAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
