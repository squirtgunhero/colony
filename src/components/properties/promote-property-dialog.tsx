"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Megaphone, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/date-utils";

interface Property {
  id: string;
  address: string;
  city: string;
  state: string | null;
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  imageUrl: string | null;
}

interface PromotePropertyDialogProps {
  property: Property | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PromotePropertyDialog({
  property,
  open,
  onOpenChange,
}: PromotePropertyDialogProps) {
  const [dailyBudget, setDailyBudget] = useState("10");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!property) return null;

  const locationText = property.state
    ? `${property.city}, ${property.state}`
    : property.city;

  const details = [
    property.bedrooms ? `${property.bedrooms} bed` : null,
    property.bathrooms ? `${property.bathrooms} bath` : null,
    property.sqft ? `${property.sqft.toLocaleString()} sqft` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  async function handlePromote() {
    if (!property) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/properties/${property.id}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          daily_budget: parseFloat(dailyBudget) || 10,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create campaign");
      }

      // If approval is required, show that message
      if (data.requires_approval) {
        toast.info("Campaign needs approval", {
          description: `Open Tara to approve the campaign for ${property.address}.`,
          duration: 6000,
        });
      } else {
        toast.success("Campaign created!", {
          description: `Facebook ad campaign launched for ${property.address} at $${dailyBudget}/day.`,
          duration: 6000,
        });
      }

      onOpenChange(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Something went wrong";
      toast.error("Promotion failed", { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Promote on Facebook
          </DialogTitle>
          <DialogDescription>
            Create a Facebook ad campaign for this listing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Property Summary */}
          <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-1">
            <p className="font-semibold">{property.address}</p>
            <p className="text-sm text-muted-foreground">{locationText}</p>
            <p className="text-lg font-bold text-primary">
              {formatCurrency(property.price)}
            </p>
            {details && (
              <p className="text-sm text-muted-foreground">{details}</p>
            )}
          </div>

          {/* Budget Input */}
          <div className="space-y-2">
            <Label htmlFor="daily-budget">Daily Budget (USD)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="daily-budget"
                type="number"
                min="1"
                step="1"
                value={dailyBudget}
                onChange={(e) => setDailyBudget(e.target.value)}
                className="pl-7"
                placeholder="10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Meta will charge up to this amount per day. You can pause or stop
              the campaign anytime from Tara or Meta Ads Manager.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handlePromote} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Megaphone className="h-4 w-4 mr-2" />
                Launch Campaign
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
