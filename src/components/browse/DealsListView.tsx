"use client";

// ============================================
// COLONY - Deals List View for Browse Mode
// ============================================

import { useState } from "react";
import Link from "next/link";
import { Search, Handshake, DollarSign, User, Home, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Deal {
  id: string;
  title: string;
  value: number | null;
  stage: string;
  probability?: number | null;
  expectedCloseDate?: Date | null;
  updatedAt: Date;
  contact?: { id: string; name: string } | null;
  property?: { id: string; address: string } | null;
}

interface DealsListViewProps {
  deals: Deal[];
}

const STAGES = ["Lead", "Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];

export function DealsListView({ deals }: DealsListViewProps) {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");

  const filteredDeals = deals.filter((deal) => {
    const matchesSearch = deal.title.toLowerCase().includes(search.toLowerCase());
    const matchesStage = stageFilter === "all" || deal.stage.toLowerCase() === stageFilter.toLowerCase();
    return matchesSearch && matchesStage;
  });

  const stages = ["all", ...STAGES];

  // Calculate totals
  const totalValue = filteredDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);
  const weightedValue = filteredDeals.reduce(
    (sum, deal) => sum + (deal.value || 0) * ((deal.probability || 0) / 100),
    0
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Deals</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredDeals.length} deal{filteredDeals.length !== 1 ? "s" : ""} · {formatCurrency(totalValue)} total
          </p>
        </div>
        <Button asChild>
          <Link href="/browse/deals/new">New Deal</Link>
        </Button>
      </div>

      {/* Summary */}
      <div className="flex gap-6 p-4 rounded-xl bg-muted/30 border border-border/50">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Pipeline Value</p>
          <p className="text-xl font-semibold">{formatCurrency(totalValue)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Weighted Value</p>
          <p className="text-xl font-semibold">{formatCurrency(weightedValue)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Active Deals</p>
          <p className="text-xl font-semibold">
            {filteredDeals.filter((d) => !d.stage.toLowerCase().includes("closed")).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {stages.slice(0, 5).map((stage) => (
            <button
              key={stage}
              onClick={() => setStageFilter(stage)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-lg capitalize transition-colors",
                stageFilter.toLowerCase() === stage.toLowerCase()
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {stage}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filteredDeals.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Handshake className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p>No deals found</p>
          </div>
        ) : (
          filteredDeals.map((deal) => (
            <Link
              key={deal.id}
              href={`/deals/${deal.id}`}
              className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/50 hover:border-border hover:shadow-sm transition-all group"
            >
              {/* Icon */}
              <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 shrink-0">
                <Handshake className="h-5 w-5 text-primary" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium truncate">{deal.title}</h3>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full",
                    deal.stage.toLowerCase().includes("won") && "bg-green-500/10 text-green-600 dark:text-green-400",
                    deal.stage.toLowerCase().includes("lost") && "bg-red-500/10 text-red-600 dark:text-red-400",
                    !deal.stage.toLowerCase().includes("closed") && "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  )}>
                    {deal.stage}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  {deal.contact && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {deal.contact.name}
                    </span>
                  )}
                  {deal.property && (
                    <span className="flex items-center gap-1 truncate">
                      <Home className="h-3 w-3" />
                      {deal.property.address}
                    </span>
                  )}
                </div>
              </div>

              {/* Value */}
              <div className="text-right">
                <div className="flex items-center gap-1 text-lg font-semibold text-primary">
                  <DollarSign className="h-4 w-4" />
                  {formatCurrency(deal.value || 0).replace("$", "")}
                </div>
                {deal.probability && (
                  <p className="text-xs text-muted-foreground">{deal.probability}% probability</p>
                )}
              </div>

              {/* Actions */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.preventDefault()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
