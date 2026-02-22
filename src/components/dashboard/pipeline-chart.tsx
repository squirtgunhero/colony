"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/date-utils";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { cn } from "@/lib/utils";

interface Property {
  id: string;
  address: string;
  status: string;
  price: number;
}

interface PipelineChartProps {
  properties: Property[];
}

const stages = [
  { id: "pre_listing", label: "Pre-Listing", shortLabel: "Pre" },
  { id: "listed", label: "Listed", shortLabel: "Listed" },
  { id: "under_contract", label: "Under Contract", shortLabel: "Contract" },
  { id: "sold", label: "Sold", shortLabel: "Sold" },
];

export function PipelineChart({ properties }: PipelineChartProps) {
  const [viewMode, setViewMode] = useState<"value" | "count">("value");
  const { theme } = useColonyTheme();

  const stageStats = stages.map((stage) => {
    const stageProperties = properties.filter((p) => p.status === stage.id);
    const totalValue = stageProperties.reduce((sum, p) => sum + (p.price || 0), 0);
    return {
      ...stage,
      count: stageProperties.length,
      value: totalValue,
    };
  });

  const totalPipelineValue = stageStats.reduce((sum, s) => sum + s.value, 0);
  const totalProperties = stageStats.reduce((sum, s) => sum + s.count, 0);
  const maxValue = Math.max(...stageStats.map((s) => s.value), 1);
  const maxCount = Math.max(...stageStats.map((s) => s.count), 1);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-overline mb-1">Pipeline Breakdown</p>
            <p className="metric-value-lg">{totalProperties}</p>
            <p className="text-caption">properties in pipeline</p>
          </div>

          <div className="flex items-center p-1 rounded-lg" style={{ backgroundColor: theme.surface }}>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 px-3 text-[11px] rounded-md")}
              style={{
                backgroundColor: viewMode === "value" ? theme.bgGlow : "transparent",
                color: viewMode === "value" ? theme.text : theme.textMuted,
              }}
              onClick={() => setViewMode("value")}
            >
              Value
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 px-3 text-[11px] rounded-md")}
              style={{
                backgroundColor: viewMode === "count" ? theme.bgGlow : "transparent",
                color: viewMode === "count" ? theme.text : theme.textMuted,
              }}
              onClick={() => setViewMode("count")}
            >
              Count
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {stageStats.map((stage, index) => {
            const percentage =
              viewMode === "value"
                ? (stage.value / maxValue) * 100
                : (stage.count / maxCount) * 100;

            const isAccent = stage.id === "under_contract";
            const intensity = 1 - (index / (stages.length - 1)) * 0.6;

            return (
              <div key={stage.id} className="group">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px]" style={{ color: theme.textMuted }}>{stage.label}</span>
                  <div className="flex items-center gap-2 text-[12px]">
                    <span style={{ color: theme.textMuted }}>({stage.count})</span>
                    <span className="font-semibold tabular-nums w-20 text-right" style={{ color: theme.text }}>
                      {formatCurrency(stage.value)}
                    </span>
                  </div>
                </div>
                <div
                  className="h-2 w-full rounded-full overflow-hidden"
                  style={{ backgroundColor: theme.surface }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(percentage, 1)}%`,
                      backgroundColor: theme.accent,
                      opacity: isAccent ? 1 : intensity,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="mt-6 pt-4 flex items-center justify-between"
          style={{ borderTop: `1px solid ${theme.accentSoft}` }}
        >
          <p className="text-[12px]" style={{ color: theme.textMuted }}>Total Pipeline</p>
          <p className="text-[15px] font-semibold tabular-nums" style={{ color: theme.text }}>
            {formatCurrency(totalPipelineValue)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
