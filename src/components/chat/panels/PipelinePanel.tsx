"use client";

// ============================================
// COLONY - Pipeline Panel for Context Drawer
// Shows pipeline overview in drawer format
// ============================================

import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, TrendingDown, Minus, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/date-utils";

interface PipelineData {
  totalValue: number;
  previousValue: number;
  stages: Array<{
    name: string;
    count: number;
    value: number;
  }>;
  recentDeals: Array<{
    id: string;
    name: string;
    value: number;
    stage: string;
  }>;
}

export function PipelinePanel() {
  const [data, setData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPipeline() {
      try {
        const res = await fetch("/api/pipeline/summary");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error("Failed to fetch pipeline:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPipeline();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-3">
          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          <div className="h-10 w-48 bg-muted animate-pulse rounded" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <BarChart3 className="h-8 w-8 mx-auto mb-3 opacity-40" />
        <p>Unable to load pipeline data</p>
      </div>
    );
  }

  const percentChange = data.previousValue > 0
    ? ((data.totalValue - data.previousValue) / data.previousValue) * 100
    : data.totalValue > 0 ? 100 : 0;

  const isPositive = percentChange > 0;
  const isNegative = percentChange < 0;

  return (
    <div className="p-6 space-y-6">
      {/* Total Pipeline Value */}
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Total Pipeline Value
        </p>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold tracking-tight">
            {formatCurrency(data.totalValue)}
          </span>
          {percentChange !== 0 ? (
            <span className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
              isPositive 
                ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                : "bg-red-500/10 text-red-600 dark:text-red-400"
            )}>
              {isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(percentChange).toFixed(1)}%
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              <Minus className="h-3 w-3" />
              0%
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">vs. previous period</p>
      </div>

      {/* Pipeline Stages */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          By Stage
        </h3>
        <div className="space-y-2">
          {data.stages.map((stage) => {
            const percentage = data.totalValue > 0 
              ? (stage.value / data.totalValue) * 100 
              : 0;
            return (
              <div key={stage.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{stage.name}</span>
                  <span className="text-muted-foreground">
                    {stage.count} · {formatCurrency(stage.value)}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary/70 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Deals */}
      {data.recentDeals.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Recent Activity
          </h3>
          <div className="space-y-2">
            {data.recentDeals.slice(0, 5).map((deal) => (
              <div 
                key={deal.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{deal.name}</p>
                  <p className="text-xs text-muted-foreground">{deal.stage}</p>
                </div>
                <div className="flex items-center gap-1 text-sm font-medium text-primary">
                  <DollarSign className="h-3.5 w-3.5" />
                  {formatCurrency(deal.value).replace("$", "")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
