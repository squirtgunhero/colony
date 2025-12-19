"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

interface Deal {
  id: string;
  title: string;
  stage: string;
  value: number | null;
}

interface PipelineChartProps {
  deals: Deal[];
}

const stages = [
  { id: "new_lead", label: "New Inquiries", shortLabel: "New" },
  { id: "qualified", label: "Qualified", shortLabel: "Qual" },
  { id: "showing", label: "Property Showings", shortLabel: "Show" },
  { id: "offer", label: "Offers Made", shortLabel: "Offer" },
  { id: "negotiation", label: "Under Contract", shortLabel: "Contract" },
  { id: "closed", label: "Closed Sales", shortLabel: "Closed" },
];

export function PipelineChart({ deals }: PipelineChartProps) {
  const [viewMode, setViewMode] = useState<"value" | "count">("value");

  const stageStats = stages.map((stage) => {
    const stageDeals = deals.filter((d) => d.stage === stage.id);
    const totalValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    return {
      ...stage,
      count: stageDeals.length,
      value: totalValue,
    };
  });

  const totalPipelineValue = stageStats.reduce((sum, s) => sum + s.value, 0);
  const totalDeals = stageStats.reduce((sum, s) => sum + s.count, 0);
  const maxValue = Math.max(...stageStats.map((s) => s.value), 1);
  const maxCount = Math.max(...stageStats.map((s) => s.count), 1);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-overline mb-1">Pipeline Breakdown</p>
            <p className="metric-value-lg">{totalDeals}</p>
            <p className="text-caption">deals in pipeline</p>
          </div>
          
          {/* Toggle */}
          <div className="flex items-center p-1 rounded-lg bg-muted/50">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-3 text-[11px] rounded-md",
                viewMode === "value" 
                  ? "bg-card shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setViewMode("value")}
            >
              Value
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-3 text-[11px] rounded-md",
                viewMode === "count" 
                  ? "bg-card shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setViewMode("count")}
            >
              Count
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Horizontal Bar Chart */}
        <div className="space-y-3">
          {stageStats.map((stage, index) => {
            const percentage =
              viewMode === "value"
                ? (stage.value / maxValue) * 100
                : (stage.count / maxCount) * 100;
            
            const isAccent = stage.id === "offer";
            const intensity = 1 - (index / (stages.length - 1)) * 0.6;

            return (
              <div key={stage.id} className="group">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] text-muted-foreground">{stage.label}</span>
                  <div className="flex items-center gap-2 text-[12px]">
                    <span className="text-muted-foreground">({stage.count})</span>
                    <span className="font-semibold tabular-nums w-20 text-right">
                      {formatCurrency(stage.value)}
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isAccent ? "bg-[#c2410c]" : "bg-foreground"
                    )}
                    style={{ 
                      width: `${Math.max(percentage, 1)}%`,
                      opacity: isAccent ? 1 : intensity
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-4 border-t border-[rgba(0,0,0,0.04)] dark:border-[rgba(255,255,255,0.04)] flex items-center justify-between">
          <p className="text-[12px] text-muted-foreground">Total Pipeline</p>
          <p className="text-[15px] font-semibold tabular-nums">{formatCurrency(totalPipelineValue)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
