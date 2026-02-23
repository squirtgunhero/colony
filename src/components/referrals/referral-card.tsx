"use client";

import Link from "next/link";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { MapPin, DollarSign, MessageCircle, Users, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ReferralListItem, ReferralStatus } from "@/lib/db/referrals";

interface ReferralCardProps {
  referral: ReferralListItem;
}

const statusLabels: Record<ReferralStatus, string> = {
  open: "Open",
  claimed: "Claimed",
  assigned: "Assigned",
  closed: "Closed",
};

const categoryLabels: Record<string, string> = {
  real_estate: "Real Estate",
  plumbing: "Plumbing",
  electrical: "Electrical",
  finance: "Finance",
  legal: "Legal",
  insurance: "Insurance",
  contractor: "Contractor",
  landscaping: "Landscaping",
  cleaning: "Cleaning",
  moving: "Moving",
  other: "Other",
};

function getCategoryLabel(category: string): string {
  return (
    categoryLabels[category] ??
    category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, " ")
  );
}

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) return email[0].toUpperCase();
  return "?";
}

function formatCurrency(value: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function ReferralCard({ referral }: ReferralCardProps) {
  const { theme } = useColonyTheme();

  const neumorphicRaised = `4px 4px 8px rgba(0,0,0,0.4), -4px -4px 8px rgba(255,255,255,0.04)`;
  const dividerColor = withAlpha(theme.text, 0.06);

  return (
    <Link href={`/referrals/${referral.id}`}>
      <div
        className="relative p-5 rounded-xl transition-all duration-200 group"
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
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: withAlpha(theme.accent, 0.15),
                  color: theme.accent,
                }}
              >
                {statusLabels[referral.status]}
              </span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: withAlpha(theme.text, 0.08),
                  color: theme.textMuted,
                }}
              >
                {getCategoryLabel(referral.category)}
              </span>
            </div>
            <h3
              className="font-semibold truncate transition-colors"
              style={{ color: theme.text }}
              onMouseEnter={(e) => (e.currentTarget.style.color = theme.accent)}
              onMouseLeave={(e) => (e.currentTarget.style.color = theme.text)}
            >
              {referral.title}
            </h3>
          </div>
          {referral.valueEstimate && (
            <div
              className="flex items-center gap-1 text-sm font-medium shrink-0"
              style={{ color: theme.accent }}
            >
              <DollarSign className="h-3.5 w-3.5" />
              {formatCurrency(referral.valueEstimate, referral.currency ?? "USD")}
            </div>
          )}
        </div>

        {/* Description */}
        {referral.description && (
          <p className="text-sm line-clamp-2 mb-3" style={{ color: theme.textMuted }}>
            {referral.description}
          </p>
        )}

        {/* Meta */}
        <div className="flex items-center gap-4 text-xs mb-4" style={{ color: theme.textMuted }}>
          {referral.locationText && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="truncate max-w-[120px]">{referral.locationText}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            <span>{referral.messageCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{referral.participantCount}</span>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between pt-3"
          style={{ borderTop: `1px solid ${dividerColor}` }}
        >
          <div className="flex items-center gap-2">
            <div
              className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-medium"
              style={{
                background: `linear-gradient(135deg, ${withAlpha(theme.accent, 0.2)}, ${withAlpha(theme.accent, 0.08)})`,
                color: theme.accent,
              }}
            >
              {getInitials(referral.createdByName, referral.createdByEmail)}
            </div>
            <span
              className="text-xs truncate max-w-[140px]"
              style={{ color: theme.textMuted }}
            >
              {referral.createdByName ?? referral.createdByEmail ?? "Unknown"}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs" style={{ color: theme.textMuted }}>
            <Clock className="h-3 w-3" />
            <span>{formatDistanceToNow(new Date(referral.updatedAt), { addSuffix: true })}</span>
          </div>
        </div>

        {/* Participant indicator */}
        {referral.isParticipant && (
          <div className="absolute top-3 right-3">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: theme.accent }}
              title="You're a participant"
            />
          </div>
        )}
      </div>
    </Link>
  );
}
