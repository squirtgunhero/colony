"use client";

// ============================================
// COLONY - Deal Panel for Context Drawer
// Shows deal details in drawer format
// ============================================

import { useEffect, useState } from "react";
import { Handshake, DollarSign, Calendar, User, Home, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";

interface Deal {
  id: string;
  title: string;
  value: number;
  stage: string;
  probability?: number;
  expectedCloseDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  contact?: { id: string; name: string };
  property?: { id: string; address: string };
}

interface DealPanelProps {
  entityId?: string;
}

const STAGES = ["Lead", "Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];

export function DealPanel({ entityId }: DealPanelProps) {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entityId) {
      setLoading(false);
      return;
    }

    async function fetchDeal() {
      try {
        const res = await fetch(`/api/deals/${entityId}`);
        if (res.ok) {
          const json = await res.json();
          setDeal(json);
        }
      } catch (error) {
        console.error("Failed to fetch deal:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDeal();
  }, [entityId]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-24 bg-muted animate-pulse rounded-lg" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Handshake className="h-8 w-8 mx-auto mb-3 opacity-40" />
        <p>Deal not found</p>
      </div>
    );
  }

  const currentStageIndex = STAGES.findIndex(
    (s) => s.toLowerCase() === deal.stage.toLowerCase()
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">{deal.title}</h3>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-2xl font-bold text-primary">
            {formatCurrency(deal.value)}
          </span>
          {deal.probability && (
            <span className="text-sm text-muted-foreground">
              {deal.probability}% probability
            </span>
          )}
        </div>
      </div>

      {/* Stage Progress */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Stage: {deal.stage}
        </h4>
        <div className="flex items-center gap-1">
          {STAGES.slice(0, -1).map((stage, index) => {
            const isCompleted = index < currentStageIndex;
            const isCurrent = index === currentStageIndex;
            const isLost = deal.stage.toLowerCase() === "closed lost";
            
            return (
              <div key={stage} className="flex items-center flex-1">
                <div 
                  className={cn(
                    "h-2 flex-1 rounded-full transition-colors",
                    isLost && index <= currentStageIndex
                      ? "bg-red-500/50"
                      : isCompleted || isCurrent
                      ? "bg-primary"
                      : "bg-muted"
                  )}
                />
                {index < STAGES.length - 2 && (
                  <ArrowRight className="h-3 w-3 text-muted-foreground/30 mx-0.5 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Lead</span>
          <span>Closed</span>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-3">
        {deal.expectedCloseDate && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Expected Close</p>
              <p className="text-sm font-medium">
                {formatDate(new Date(deal.expectedCloseDate))}
              </p>
            </div>
          </div>
        )}
        {deal.contact && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Contact</p>
              <p className="text-sm font-medium">{deal.contact.name}</p>
            </div>
          </div>
        )}
        {deal.property && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <Home className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Property</p>
              <p className="text-sm font-medium">{deal.property.address}</p>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      {deal.notes && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Notes
          </h4>
          <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
            {deal.notes}
          </p>
        </div>
      )}

      {/* Timestamps */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t border-border/50">
        <Calendar className="h-3.5 w-3.5" />
        <span>Created {formatDate(new Date(deal.createdAt))}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button size="sm" variant="outline" className="flex-1">
          Edit
        </Button>
        <Button size="sm" className="flex-1">
          Move Stage
        </Button>
      </div>
    </div>
  );
}
