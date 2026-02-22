"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/date-utils";
import { useColonyTheme } from "@/lib/chat-theme-context";
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

interface Property {
  id: string;
  address: string;
  status: string;
  price: number;
}

interface PipelineBarChartProps {
  properties: Property[];
}

const stageIds = ["pre_listing", "listed", "under_contract", "sold"] as const;
const stageLabels: Record<string, string> = {
  pre_listing: "Pre-Listing",
  listed: "Listed",
  under_contract: "Contract",
  sold: "Sold",
};

export function PipelineBarChart({ properties }: PipelineBarChartProps) {
  const { theme } = useColonyTheme();

  const data = stageIds.map((id, index) => {
    const stageProperties = properties.filter((p) => p.status === id);
    const totalValue = stageProperties.reduce((sum, p) => sum + (p.price || 0), 0);
    const opacity = 1 - index * 0.2;
    return {
      name: stageLabels[id],
      value: totalValue,
      count: stageProperties.length,
      isAccent: id === "under_contract",
      opacity,
    };
  });

  const totalValue = data.reduce((sum, d) => sum + d.value, 0);
  const averageValue = totalValue / data.filter(d => d.value > 0).length || 0;
  const maxStage = data.reduce((max, d) => d.value > max.value ? d : max, data[0]);

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-overline mb-1">Pipeline Overview</p>
            <p className="metric-value-lg">{formatCurrency(totalValue)}</p>
          </div>
          <div className="text-right">
            <p className="text-overline mb-1">Top Stage</p>
            <p className="text-[15px] font-semibold">{maxStage.name}</p>
            <p className="text-caption">{formatCurrency(maxStage.value)}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 0, left: -24, bottom: 0 }}
              barCategoryGap="20%"
            >
              <ReferenceLine
                y={averageValue}
                stroke={theme.accentSoft}
                strokeDasharray="4 4"
                label={{
                  value: "avg",
                  position: "right",
                  fontSize: 10,
                  fill: theme.textMuted,
                  offset: 8,
                }}
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: theme.textMuted }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: theme.textMuted }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                width={48}
              />
              <Tooltip
                cursor={{ fill: theme.accentGlow }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div
                      className="rounded-lg p-3 shadow-lg"
                      style={{
                        backgroundColor: theme.bgGlow,
                        border: `1px solid ${theme.accentSoft}`,
                      }}
                    >
                      <p className="text-[13px] font-semibold" style={{ color: theme.text }}>
                        {d.name}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: theme.textMuted }}>
                        {d.count} propert{d.count !== 1 ? "ies" : "y"}
                      </p>
                      <p className="metric-value mt-1.5" style={{ color: theme.text }}>
                        {formatCurrency(d.value)}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={44}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={theme.accent}
                    fillOpacity={entry.isAccent ? 1 : entry.opacity}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div
          className="mt-6 pt-4 flex flex-wrap gap-4"
          style={{ borderTop: `1px solid ${theme.accentSoft}` }}
        >
          {data.filter(d => d.count > 0).map((stage, i) => (
            <div key={stage.name} className="flex items-center gap-2 text-[11px]">
              <div
                className="h-2 w-2 rounded-sm"
                style={{ backgroundColor: theme.accent, opacity: stage.isAccent ? 1 : stage.opacity }}
              />
              <span style={{ color: theme.textMuted }}>{stage.name}</span>
              <span className="font-medium tabular-nums" style={{ color: theme.text }}>
                ({stage.count})
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
