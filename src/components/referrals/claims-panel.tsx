"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Check, X, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { ReferralClaimInfo, ClaimStatus } from "@/lib/db/referrals";

interface ClaimsPanelProps {
  referralId: string;
  claims: ReferralClaimInfo[];
  isCreator: boolean;
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

const statusConfig: Record<ClaimStatus, { label: string; icon: React.ElementType; className: string }> = {
  requested: {
    label: "Pending",
    icon: Clock,
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  accepted: {
    label: "Accepted",
    icon: Check,
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  rejected: {
    label: "Rejected",
    icon: X,
    className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
};

function ClaimCard({
  claim,
  referralId,
  isCreator,
  onUpdate,
}: {
  claim: ReferralClaimInfo;
  referralId: string;
  isCreator: boolean;
  onUpdate: () => void;
}) {
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);
  const status = statusConfig[claim.status];
  const StatusIcon = status.icon;
  const isPending = claim.status === "requested";

  const handleAction = async (action: "accept" | "reject") => {
    setLoading(action);
    try {
      const response = await fetch(`/api/referrals/${referralId}/claims/${claim.id}/${action}`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? `Failed to ${action} claim`);
      }

      toast.success(action === "accept" ? "Claim accepted!" : "Claim rejected");
      onUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${action} claim`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-primary">
            {getInitials(claim.claimantName, claim.claimantEmail)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-medium text-foreground truncate">
                {claim.claimantName ?? claim.claimantEmail ?? "Unknown"}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(claim.createdAt), { addSuffix: true })}
              </p>
            </div>

            <Badge variant="outline" className={cn("shrink-0", status.className)}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>

          {claim.message && (
            <p className="mt-2 text-sm text-muted-foreground">{claim.message}</p>
          )}

          {isCreator && isPending && (
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={() => handleAction("accept")}
                disabled={loading !== null}
              >
                {loading === "accept" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction("reject")}
                disabled={loading !== null}
              >
                {loading === "reject" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <X className="h-4 w-4 mr-1" />
                )}
                Reject
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function ClaimsPanel({ referralId, claims, isCreator }: ClaimsPanelProps) {
  const router = useRouter();

  const handleUpdate = () => {
    router.refresh();
  };

  if (claims.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <User className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p>No claims yet</p>
        <p className="text-sm mt-1">Waiting for someone to claim this referral</p>
      </div>
    );
  }

  const pendingClaims = claims.filter((c) => c.status === "requested");
  const resolvedClaims = claims.filter((c) => c.status !== "requested");

  return (
    <div className="space-y-6">
      {pendingClaims.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-foreground mb-3">
            Pending Claims ({pendingClaims.length})
          </h4>
          <div className="space-y-3">
            {pendingClaims.map((claim) => (
              <ClaimCard
                key={claim.id}
                claim={claim}
                referralId={referralId}
                isCreator={isCreator}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        </div>
      )}

      {resolvedClaims.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Past Claims ({resolvedClaims.length})
          </h4>
          <div className="space-y-3">
            {resolvedClaims.map((claim) => (
              <ClaimCard
                key={claim.id}
                claim={claim}
                referralId={referralId}
                isCreator={isCreator}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

