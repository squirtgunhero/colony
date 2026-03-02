"use client";

import Link from "next/link";
import { withAlpha } from "@/lib/themes";
import { BRAND } from "./marketplace-theme";
import {
  MapPin,
  DollarSign,
  Clock,
  Hand,
  Building2,
  Wrench,
  Zap,
  TrendingUp,
  Scale,
  Shield,
  Hammer,
  Leaf,
  Sparkles,
  Truck,
  MoreHorizontal,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface MarketplaceReferral {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  locationText: string | null;
  valueEstimate: number | null;
  currency: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  claimCount: number;
  messageCount: number;
  isLoggedIn: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
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

const CATEGORY_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  real_estate: Building2,
  plumbing: Wrench,
  electrical: Zap,
  finance: TrendingUp,
  legal: Scale,
  insurance: Shield,
  contractor: Hammer,
  landscaping: Leaf,
  cleaning: Sparkles,
  moving: Truck,
  other: MoreHorizontal,
};

function getCategoryLabel(category: string): string {
  return (
    CATEGORY_LABELS[category] ??
    category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, " ")
  );
}

function formatCurrency(value: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface MarketplaceReferralCardProps {
  referral: MarketplaceReferral;
  onClaim?: () => void;
}

export function MarketplaceReferralCard({
  referral,
  onClaim,
}: MarketplaceReferralCardProps) {
  const theme = BRAND;
  const neumorphicRaised =
    "4px 4px 8px rgba(0,0,0,0.4), -4px -4px 8px rgba(255,255,255,0.04)";
  const CategoryIcon = CATEGORY_ICONS[referral.category] ?? MoreHorizontal;

  return (
    <div className="flex flex-col">
      <Link href={`/marketplace/${referral.id}`} className="flex-1">
        <div
          className="relative p-5 rounded-xl transition-all duration-200 h-full"
          style={{
            backgroundColor: theme.bgGlow,
            boxShadow: neumorphicRaised,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = `2px 2px 4px rgba(0,0,0,0.3), -2px -2px 4px rgba(255,255,255,0.03), 0 0 12px ${withAlpha(theme.accent, 0.1)}`;
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = neumorphicRaised;
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
              style={{
                backgroundColor: withAlpha(theme.accent, 0.12),
                color: theme.accent,
              }}
            >
              <CategoryIcon className="h-3.5 w-3.5" />
              {getCategoryLabel(referral.category)}
            </div>
            {referral.valueEstimate != null && referral.valueEstimate > 0 && (
              <div
                className="flex items-center gap-1 ml-auto text-sm font-semibold"
                style={{ color: theme.accent }}
              >
                <DollarSign className="h-3.5 w-3.5" />
                {formatCurrency(
                  referral.valueEstimate,
                  referral.currency ?? "USD"
                )}
              </div>
            )}
          </div>

          <h3
            className="font-semibold mb-2 line-clamp-2 leading-snug"
            style={{ color: theme.text }}
          >
            {referral.title}
          </h3>

          {referral.description && (
            <p
              className="text-sm line-clamp-2 mb-4"
              style={{ color: theme.textMuted }}
            >
              {referral.description}
            </p>
          )}

          <div
            className="flex items-center gap-3 text-xs mb-4"
            style={{ color: theme.textMuted }}
          >
            {referral.locationText && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span className="truncate max-w-[120px]">
                  {referral.locationText}
                </span>
              </div>
            )}
            {referral.claimCount > 0 && (
              <div className="flex items-center gap-1">
                <Hand className="h-3 w-3" />
                <span>
                  {referral.claimCount} claim
                  {referral.claimCount !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>

          <div
            className="flex items-center justify-between pt-3"
            style={{
              borderTop: `1px solid ${withAlpha(theme.text, 0.06)}`,
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-medium"
                style={{
                  background: `linear-gradient(135deg, ${withAlpha(theme.accent, 0.2)}, ${withAlpha(theme.accent, 0.08)})`,
                  color: theme.accent,
                }}
              >
                {getInitials(referral.createdByName)}
              </div>
              <span className="text-xs" style={{ color: theme.textMuted }}>
                {referral.createdByName ?? "Anonymous"}
              </span>
            </div>
            <div
              className="flex items-center gap-1 text-xs"
              style={{ color: theme.textMuted }}
            >
              <Clock className="h-3 w-3" />
              <span>
                {formatDistanceToNow(new Date(referral.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
        </div>
      </Link>

      {referral.status === "open" && onClaim && (
        <button
          onClick={onClaim}
          className="mt-2 py-2 rounded-lg text-sm font-medium transition-all duration-200"
          style={{
            backgroundColor: withAlpha(theme.accent, 0.1),
            color: theme.accent,
            border: `1px solid ${withAlpha(theme.accent, 0.2)}`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.accent;
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = withAlpha(
              theme.accent,
              0.1
            );
            e.currentTarget.style.color = theme.accent;
          }}
        >
          {referral.isLoggedIn ? "Claim Referral" : "Sign Up to Claim"}
        </button>
      )}
    </div>
  );
}
