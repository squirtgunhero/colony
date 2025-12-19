"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface LeadSourcesChartProps {
  sources: { name: string; count: number }[];
}

// Sophisticated grayscale with one warm accent
const COLORS = ["#171717", "#525252", "#737373", "#a3a3a3", "#d4d4d4"];

export function LeadSourcesChart({ sources }: LeadSourcesChartProps) {
  const data = sources.slice(0, 5).map((source, index) => ({
    name: source.name,
    value: source.count,
    color: COLORS[index % COLORS.length],
  }));

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const topSource = data.length > 0 ? data[0] : null;

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <p className="text-overline">Lead Sources</p>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-caption">No source data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <p className="text-overline mb-1">Lead Sources</p>
        <p className="metric-value">{total}</p>
        <p className="text-caption mt-0.5">Total leads tracked</p>
      </CardHeader>
      
      <CardContent className="pt-4">
        {/* Chart with center metric */}
        <div className="h-[160px] w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  const percentage = ((d.value / total) * 100).toFixed(0);
                  return (
                    <div className="bg-card border border-[rgba(0,0,0,0.06)] rounded-lg p-3 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                      <p className="text-[13px] font-semibold">{d.name}</p>
                      <p className="text-[18px] font-semibold mt-1 tabular-nums">
                        {d.value} <span className="text-[11px] font-normal text-muted-foreground">({percentage}%)</span>
                      </p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center label - Top source */}
          {topSource && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Top</p>
              <p className="text-[13px] font-semibold mt-0.5 max-w-[60px] truncate text-center">{topSource.name}</p>
            </div>
          )}
        </div>

        {/* Legend - Vertical list */}
        <div className="mt-4 pt-4 border-t border-[rgba(0,0,0,0.04)] space-y-2">
          {data.map((source) => {
            const percentage = ((source.value / total) * 100).toFixed(0);
            return (
              <div key={source.name} className="flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-sm"
                    style={{ backgroundColor: source.color }}
                  />
                  <span className="text-muted-foreground">{source.name}</span>
                </div>
                <div className="flex items-center gap-2 tabular-nums">
                  <span className="font-medium">{source.value}</span>
                  <span className="text-muted-foreground w-8 text-right">{percentage}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
