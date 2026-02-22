"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useColonyTheme } from "@/lib/chat-theme-context";
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

export function LeadSourcesChart({ sources }: LeadSourcesChartProps) {
  const { theme } = useColonyTheme();

  const opacities = [1, 0.75, 0.55, 0.4, 0.25];

  const data = sources.slice(0, 5).map((source, index) => ({
    name: source.name,
    value: source.count,
    opacity: opacities[index] ?? 0.25,
  }));

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const topSource = data.length > 0 ? data[0] : null;

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <p className="text-overline">Contact Sources</p>
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
        <p className="text-overline mb-1">Contact Sources</p>
        <p className="metric-value">{total}</p>
        <p className="text-caption mt-0.5">Total contacts tracked</p>
      </CardHeader>

      <CardContent className="pt-4">
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
                  <Cell
                    key={`cell-${index}`}
                    fill={theme.accent}
                    fillOpacity={entry.opacity}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  const percentage = ((d.value / total) * 100).toFixed(0);
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
                      <p className="text-[18px] font-semibold mt-1 tabular-nums" style={{ color: theme.text }}>
                        {d.value}{" "}
                        <span className="text-[11px] font-normal" style={{ color: theme.textMuted }}>
                          ({percentage}%)
                        </span>
                      </p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {topSource && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: theme.textMuted }}>
                Top
              </p>
              <p className="text-[13px] font-semibold mt-0.5 max-w-[60px] truncate text-center" style={{ color: theme.text }}>
                {topSource.name}
              </p>
            </div>
          )}
        </div>

        <div
          className="mt-4 pt-4 space-y-2"
          style={{ borderTop: `1px solid ${theme.accentSoft}` }}
        >
          {data.map((source) => {
            const percentage = ((source.value / total) * 100).toFixed(0);
            return (
              <div key={source.name} className="flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-sm"
                    style={{ backgroundColor: theme.accent, opacity: source.opacity }}
                  />
                  <span style={{ color: theme.textMuted }}>{source.name}</span>
                </div>
                <div className="flex items-center gap-2 tabular-nums">
                  <span className="font-medium" style={{ color: theme.text }}>{source.value}</span>
                  <span className="w-8 text-right" style={{ color: theme.textMuted }}>{percentage}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
