"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClaimDialog } from "./claim-dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  MapPin,
  DollarSign,
  MoreHorizontal,
  Hand,
  Lock,
  Globe,
  Users,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { ReferralDetail, ReferralStatus, ReferralVisibility } from "@/lib/db/referrals";

interface ReferralDetailHeaderProps {
  referral: ReferralDetail;
  currentUserId: string;
}

const statusConfig: Record<ReferralStatus, { label: string; className: string }> = {
  open: {
    label: "Open",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  claimed: {
    label: "Claimed",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  assigned: {
    label: "Assigned",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  closed: {
    label: "Closed",
    className: "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20",
  },
};

const visibilityConfig: Record<ReferralVisibility, { label: string; icon: React.ElementType }> = {
  public: { label: "Public", icon: Globe },
  network: { label: "Network", icon: Users },
  org: { label: "Organization", icon: Lock },
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
  return categoryLabels[category] ?? category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, " ");
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
  if (email) {
    return email[0].toUpperCase();
  }
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

export function ReferralDetailHeader({ referral, currentUserId }: ReferralDetailHeaderProps) {
  const router = useRouter();
  const [closing, setClosing] = useState(false);

  const status = statusConfig[referral.status];
  const visibility = visibilityConfig[referral.visibility];
  const VisibilityIcon = visibility.icon;

  const canClaim = referral.status === "open" && !referral.isCreator;
  const hasExistingClaim = referral.claims.some(
    (c) => c.claimantUserId === currentUserId && c.status === "requested"
  );

  const handleClose = async () => {
    setClosing(true);
    try {
      const response = await fetch(`/api/referrals/${referral.id}/close`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to close referral");
      }

      toast.success("Referral closed");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to close referral");
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="border-b border-border">
      <div className="px-4 py-4 sm:px-8 sm:py-6">
        {/* Back link */}
        <Link
          href="/referrals"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Referrals
        </Link>

        {/* Header content */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            {/* Badges */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline" className={cn("text-xs", status.className)}>
                {status.label}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {getCategoryLabel(referral.category)}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <VisibilityIcon className="h-3 w-3 mr-1" />
                {visibility.label}
              </Badge>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-semibold text-foreground mb-2">{referral.title}</h1>

            {/* Meta */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              {referral.locationText && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{referral.locationText}</span>
                </div>
              )}
              {referral.valueEstimate && (
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <DollarSign className="h-4 w-4" />
                  <span>{formatCurrency(referral.valueEstimate, referral.currency ?? "USD")}</span>
                </div>
              )}
              <span>Posted {format(new Date(referral.createdAt), "MMM d, yyyy")}</span>
            </div>

            {/* Creator */}
            <div className="flex items-center gap-2 mt-4">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getInitials(referral.createdByName, referral.createdByEmail)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {referral.createdByName ?? referral.createdByEmail ?? "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground">Creator</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {canClaim && !hasExistingClaim && (
              <ClaimDialog referralId={referral.id} referralTitle={referral.title}>
                <Button>
                  <Hand className="h-4 w-4 mr-2" />
                  Claim
                </Button>
              </ClaimDialog>
            )}

            {hasExistingClaim && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                Claim Pending
              </Badge>
            )}

            {referral.isCreator && referral.status !== "closed" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled>Edit Referral</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleClose}
                    disabled={closing}
                    className="text-destructive"
                  >
                    {closing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Close Referral
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

