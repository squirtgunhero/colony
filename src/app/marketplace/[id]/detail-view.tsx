"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { ClaimDialog } from "@/components/referrals/claim-dialog";
import { SignUpPrompt } from "@/components/marketplace/sign-up-prompt";
import {
  MarketplaceReferralCard,
  type MarketplaceReferral,
} from "@/components/marketplace/marketplace-referral-card";
import {
  MapPin,
  DollarSign,
  Clock,
  Hand,
  MessageCircle,
  ArrowLeft,
  Calendar,
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
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface ReferralComment {
  id: string;
  bodyText: string | null;
  createdByName: string | null;
  createdAt: string;
}

interface ReferralDetail {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  locationText: string | null;
  valueEstimate: number | null;
  currency: string | null;
  createdByName: string | null;
  creatorJoinedAt: string | null;
  createdAt: string;
  updatedAt: string;
  claimCount: number;
  messageCount: number;
  comments: ReferralComment[];
}

interface MarketplaceDetailViewProps {
  referral: ReferralDetail;
  relatedReferrals: MarketplaceReferral[];
  isLoggedIn: boolean;
  hasUserClaimed: boolean;
  userClaimStatus: string | null;
  autoOpenClaim: boolean;
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

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  claimed: "Claimed",
  assigned: "Assigned",
  closed: "Closed",
};

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

export function MarketplaceDetailView({
  referral,
  relatedReferrals,
  isLoggedIn,
  hasUserClaimed,
  userClaimStatus,
  autoOpenClaim,
}: MarketplaceDetailViewProps) {
  const { theme } = useColonyTheme();
  const router = useRouter();
  const [signUpOpen, setSignUpOpen] = useState(false);

  const CategoryIcon = CATEGORY_ICONS[referral.category] ?? MoreHorizontal;
  const categoryLabel =
    CATEGORY_LABELS[referral.category] ?? referral.category;
  const neumorphic =
    "4px 4px 8px rgba(0,0,0,0.4), -4px -4px 8px rgba(255,255,255,0.04)";

  const handleClaimClick = () => {
    if (!isLoggedIn) {
      setSignUpOpen(true);
    }
  };

  const renderClaimSection = () => {
    if (referral.status === "closed") {
      return (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
          style={{
            backgroundColor: withAlpha(theme.text, 0.06),
            color: theme.textMuted,
          }}
        >
          <XCircle className="h-4 w-4" />
          This referral is closed
        </div>
      );
    }

    if (hasUserClaimed) {
      return (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
          style={{
            backgroundColor: withAlpha(theme.accent, 0.1),
            color: theme.accent,
          }}
        >
          {userClaimStatus === "accepted" ? (
            <>
              <CheckCircle className="h-4 w-4" />
              Your claim was accepted
            </>
          ) : userClaimStatus === "rejected" ? (
            <>
              <XCircle className="h-4 w-4" />
              Your claim was declined
            </>
          ) : (
            <>
              <Loader2 className="h-4 w-4" />
              Your claim is pending review
            </>
          )}
        </div>
      );
    }

    if (referral.status !== "open") {
      return (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
          style={{
            backgroundColor: withAlpha(theme.text, 0.06),
            color: theme.textMuted,
          }}
        >
          <Hand className="h-4 w-4" />
          This referral has been {STATUS_LABELS[referral.status]?.toLowerCase() ?? "claimed"}
        </div>
      );
    }

    if (isLoggedIn) {
      return (
        <ClaimDialog
          referralId={referral.id}
          referralTitle={referral.title}
          defaultOpen={autoOpenClaim}
        >
          <button
            className="w-full py-3 rounded-xl text-sm font-medium transition-all duration-200"
            style={{
              backgroundColor: theme.accent,
              color: "#fff",
            }}
          >
            <Hand className="h-4 w-4 inline mr-2" />
            Claim This Referral
          </button>
        </ClaimDialog>
      );
    }

    return (
      <button
        onClick={handleClaimClick}
        className="w-full py-3 rounded-xl text-sm font-medium transition-all duration-200"
        style={{
          backgroundColor: theme.accent,
          color: "#fff",
        }}
      >
        <Hand className="h-4 w-4 inline mr-2" />
        Sign Up to Claim
      </button>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-2 text-sm mb-6 transition-opacity hover:opacity-80"
        style={{ color: theme.textMuted }}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Marketplace
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header card */}
          <div
            className="p-6 rounded-xl"
            style={{ backgroundColor: theme.bgGlow, boxShadow: neumorphic }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: withAlpha(theme.accent, 0.12),
                  color: theme.accent,
                }}
              >
                <CategoryIcon className="h-4 w-4" />
                {categoryLabel}
              </div>
              <div
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  backgroundColor: withAlpha(theme.text, 0.08),
                  color: theme.textMuted,
                }}
              >
                {STATUS_LABELS[referral.status] ?? referral.status}
              </div>
            </div>

            <h1
              className="text-2xl sm:text-3xl font-semibold mb-4"
              style={{ color: theme.text }}
            >
              {referral.title}
            </h1>

            {referral.valueEstimate != null && referral.valueEstimate > 0 && (
              <div
                className="flex items-center gap-2 text-xl font-semibold mb-4"
                style={{ color: theme.accent }}
              >
                <DollarSign className="h-5 w-5" />
                {formatCurrency(
                  referral.valueEstimate,
                  referral.currency ?? "USD"
                )}
              </div>
            )}

            {referral.description && (
              <p
                className="text-sm leading-relaxed whitespace-pre-wrap mb-6"
                style={{ color: theme.textSoft }}
              >
                {referral.description}
              </p>
            )}

            <div
              className="flex flex-wrap items-center gap-4 text-sm pt-4"
              style={{
                borderTop: `1px solid ${withAlpha(theme.text, 0.06)}`,
                color: theme.textMuted,
              }}
            >
              {referral.locationText && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {referral.locationText}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {formatDistanceToNow(new Date(referral.createdAt), {
                  addSuffix: true,
                })}
              </div>
              <div className="flex items-center gap-1.5">
                <Hand className="h-4 w-4" />
                {referral.claimCount} claim
                {referral.claimCount !== 1 ? "s" : ""}
              </div>
              <div className="flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4" />
                {referral.messageCount} message
                {referral.messageCount !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          {/* Comments */}
          <div
            className="p-6 rounded-xl"
            style={{ backgroundColor: theme.bgGlow, boxShadow: neumorphic }}
          >
            <h2
              className="text-lg font-semibold mb-4 flex items-center gap-2"
              style={{ color: theme.text }}
            >
              <MessageCircle className="h-5 w-5" />
              Comments ({referral.comments.length})
            </h2>

            {referral.comments.length === 0 ? (
              <p className="text-sm py-6 text-center" style={{ color: theme.textMuted }}>
                No comments yet. {isLoggedIn ? "Be the first to comment!" : "Sign in to leave a comment."}
              </p>
            ) : (
              <div className="space-y-4">
                {referral.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="flex gap-3 p-3 rounded-lg"
                    style={{
                      backgroundColor: withAlpha(theme.text, 0.03),
                    }}
                  >
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${withAlpha(theme.accent, 0.2)}, ${withAlpha(theme.accent, 0.08)})`,
                        color: theme.accent,
                      }}
                    >
                      {getInitials(comment.createdByName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-sm font-medium"
                          style={{ color: theme.text }}
                        >
                          {comment.createdByName ?? "Anonymous"}
                        </span>
                        <span
                          className="text-xs"
                          style={{ color: theme.textMuted }}
                        >
                          {formatDistanceToNow(new Date(comment.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <p
                        className="text-sm"
                        style={{ color: theme.textSoft }}
                      >
                        {comment.bodyText}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Claim section */}
          <div
            className="p-5 rounded-xl"
            style={{ backgroundColor: theme.bgGlow, boxShadow: neumorphic }}
          >
            {renderClaimSection()}

            {referral.claimCount > 0 && (
              <p
                className="text-xs text-center mt-3"
                style={{ color: theme.textMuted }}
              >
                {referral.claimCount} person
                {referral.claimCount !== 1 ? "s have" : " has"} claimed this
                referral
              </p>
            )}
          </div>

          {/* Creator info */}
          <div
            className="p-5 rounded-xl"
            style={{ backgroundColor: theme.bgGlow, boxShadow: neumorphic }}
          >
            <h3
              className="text-sm font-medium mb-3"
              style={{ color: theme.textMuted }}
            >
              Posted by
            </h3>
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium"
                style={{
                  background: `linear-gradient(135deg, ${withAlpha(theme.accent, 0.2)}, ${withAlpha(theme.accent, 0.08)})`,
                  color: theme.accent,
                }}
              >
                {getInitials(referral.createdByName)}
              </div>
              <div>
                <p
                  className="font-medium text-sm"
                  style={{ color: theme.text }}
                >
                  {referral.createdByName ?? "Anonymous"}
                </p>
                {referral.creatorJoinedAt && (
                  <p className="text-xs" style={{ color: theme.textMuted }}>
                    <Calendar className="h-3 w-3 inline mr-1" />
                    Joined{" "}
                    {format(new Date(referral.creatorJoinedAt), "MMM yyyy")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Related referrals */}
          {relatedReferrals.length > 0 && (
            <div>
              <h3
                className="text-sm font-medium mb-3"
                style={{ color: theme.textMuted }}
              >
                Related Referrals
              </h3>
              <div className="space-y-4">
                {relatedReferrals.map((rel) => (
                  <MarketplaceReferralCard key={rel.id} referral={rel} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <SignUpPrompt
        open={signUpOpen}
        onOpenChange={setSignUpOpen}
        referralTitle={referral.title}
      />
    </div>
  );
}
