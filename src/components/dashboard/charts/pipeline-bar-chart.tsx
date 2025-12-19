"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/date-utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

interface Deal {
  id: string;
  title: string;
  stage: string;
  value: number | null;
}

interface PipelineBarChartProps {
  deals: Deal[];
}

// Sophisticated neutrals - ONE accent highlight
const stages = [
  { id: "new_lead", label: "New", color: "#e5e5e5" },
  { id: "qualified", label: "Qualified", color: "#d4d4d4" },
  { id: "showing", label: "Showing", color: "#a3a3a3" },
  { id: "offer", label: "Offer", color: "#c2410c" },  // Accent: highlight key stage
  { id: "negotiation", label: "Contract", color: "#525252" },
  { id: "closed", label: "Closed", color: "#171717" },
];

export function PipelineBarChart({ deals }: PipelineBarChartProps) {
  const data = stages.map((stage) => {
    const stageDeals = deals.filter((d) => d.stage === stage.id);
    const totalValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    return {
      name: stage.label,
      value: totalValue,
      count: stageDeals.length,
      color: stage.color,
      isAccent: stage.id === "offer",
    };
  });

  const totalValue = data.reduce((sum, d) => sum + d.value, 0);
  const averageValue = totalValue / data.filter(d => d.value > 0).length || 0;

  // Find the highest value stage (key data point)
  const maxStage = data.reduce((max, d) => d.value > max.value ? d : max, data[0]);

  return (
    <Card>
      {/* Header: Editorial layout - value as hero */}
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-overline mb-1">Pipeline Overview</p>
            <p className="metric-value-lg">{formatCurrency(totalValue)}</p>
          </div>
          {/* Key insight */}
          <div className="text-right">
            <p className="text-overline mb-1">Top Stage</p>
            <p className="text-[15px] font-semibold">{maxStage.name}</p>
            <p className="text-caption">{formatCurrency(maxStage.value)}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Chart - Clean, minimal grid */}
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 0, left: -24, bottom: 0 }}
              barCategoryGap="20%"
            >
              {/* Single reference line at average - editorial touch */}
              <ReferenceLine 
                y={averageValue} 
                stroke="rgba(0,0,0,0.1)" 
                strokeDasharray="4 4"
                label={{ 
                  value: "avg", 
                  position: "right", 
                  fontSize: 10, 
                  fill: "#a3a3a3",
                  offset: 8
                }}
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#a3a3a3" }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#a3a3a3" }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                width={48}
              />
              <Tooltip
                cursor={{ fill: "rgba(0,0,0,0.02)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-card border border-[rgba(0,0,0,0.06)] rounded-lg p-3 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                      <p className="text-[13px] font-semibold text-foreground">{d.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {d.count} deal{d.count !== 1 ? "s" : ""}
                      </p>
                      <p className="metric-value mt-1.5">{formatCurrency(d.value)}</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={44}>
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    className={entry.isAccent ? "drop-shadow-sm" : ""}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend - Minimal, inline */}
        <div className="mt-6 pt-4 border-t border-[rgba(0,0,0,0.04)] dark:border-[rgba(255,255,255,0.04)] flex flex-wrap gap-4">
          {data.filter(d => d.count > 0).map((stage) => (
            <div key={stage.name} className="flex items-center gap-2 text-[11px]">
              <div
                className="h-2 w-2 rounded-sm"
                style={{ backgroundColor: stage.color }}
              />
              <span className="text-muted-foreground">{stage.name}</span>
              <span className="font-medium tabular-nums">({stage.count})</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
