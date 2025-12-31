"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, DollarSign, MessageCircle, Users, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { ReferralListItem, ReferralStatus } from "@/lib/db/referrals";

interface ReferralCardProps {
  referral: ReferralListItem;
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

export function ReferralCard({ referral }: ReferralCardProps) {
  const status = statusConfig[referral.status];

  return (
    <Link href={`/referrals/${referral.id}`}>
      <Card interactive className="p-5 group">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className={cn("text-[10px] font-medium", status.className)}>
                {status.label}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {getCategoryLabel(referral.category)}
              </Badge>
            </div>
            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {referral.title}
            </h3>
          </div>
          {referral.valueEstimate && (
            <div className="flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
              <DollarSign className="h-3.5 w-3.5" />
              {formatCurrency(referral.valueEstimate, referral.currency ?? "USD")}
            </div>
          )}
        </div>

        {/* Description */}
        {referral.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {referral.description}
          </p>
        )}

        {/* Meta */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
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
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {getInitials(referral.createdByName, referral.createdByEmail)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate max-w-[140px]">
              {referral.createdByName ?? referral.createdByEmail ?? "Unknown"}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatDistanceToNow(new Date(referral.updatedAt), { addSuffix: true })}</span>
          </div>
        </div>

        {/* Participant indicator */}
        {referral.isParticipant && (
          <div className="absolute top-3 right-3">
            <div className="h-2 w-2 rounded-full bg-primary" title="You're a participant" />
          </div>
        )}
      </Card>
    </Link>
  );
}

