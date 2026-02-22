"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/date-utils";
import { useColonyTheme } from "@/lib/chat-theme-context";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

interface Property {
  id: string;
  address: string;
  status: string;
  price: number;
  createdAt?: Date;
}

interface DealsTrendChartProps {
  properties: Property[];
}

export function DealsTrendChart({ properties }: DealsTrendChartProps) {
  const { theme } = useColonyTheme();
  const today = new Date();
  const currentMonthIndex = 5;

  const months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(today, 5 - i);
    return {
      date,
      month: format(date, "MMM"),
      isCurrentMonth: i === currentMonthIndex,
      start: startOfMonth(date),
      end: endOfMonth(date),
    };
  });

  const data = months.map(({ month, start, end, isCurrentMonth }) => {
    const monthProperties = properties.filter((property) =>
      property.createdAt ? isWithinInterval(new Date(property.createdAt), { start, end }) : false
    );
    const soldProperties = monthProperties.filter((p) => p.status === "sold");
    const totalValue = monthProperties.reduce((sum, p) => sum + (p.price || 0), 0);
    const soldValue = soldProperties.reduce((sum, p) => sum + (p.price || 0), 0);

    return {
      name: month,
      pipeline: totalValue,
      closed: soldValue,
      properties: monthProperties.length,
      isCurrentMonth,
    };
  });

  const totalClosed = data.reduce((sum, d) => sum + d.closed, 0);
  const currentMonth = data[data.length - 1];

  const closedGradientId = `gradientClosed-${theme.id}`;
  const pipelineGradientId = `gradientPipeline-${theme.id}`;

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-overline mb-1">Revenue Trend</p>
            <p className="metric-value-lg">{formatCurrency(totalClosed)}</p>
            <p className="text-caption mt-0.5">Total sold (6 months)</p>
          </div>
          <div className="text-right p-3 rounded-xl" style={{ backgroundColor: theme.surface }}>
            <p className="text-overline mb-0.5">{currentMonth.name}</p>
            <p className="text-[15px] font-semibold">{formatCurrency(currentMonth.closed)}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
            >
              <defs>
                <linearGradient id={closedGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={theme.accent} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={theme.accent} stopOpacity={0} />
                </linearGradient>
                <linearGradient id={pipelineGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={theme.textMuted} stopOpacity={0.1} />
                  <stop offset="100%" stopColor={theme.textMuted} stopOpacity={0} />
                </linearGradient>
              </defs>
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
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div
                      className="rounded-lg p-3 shadow-lg"
                      style={{
                        backgroundColor: theme.bgGlow,
                        border: `1px solid ${theme.accentSoft}`,
                      }}
                    >
                      <p className="text-[13px] font-semibold mb-2" style={{ color: theme.text }}>
                        {label}
                      </p>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-[11px]">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: theme.accent }} />
                          <span style={{ color: theme.textMuted }}>Sold:</span>
                          <span className="font-semibold tabular-nums" style={{ color: theme.text }}>
                            {formatCurrency(d?.closed || 0)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <div className="h-2 w-2 rounded-full" style={{ color: theme.textMuted, backgroundColor: theme.textSoft }} />
                          <span style={{ color: theme.textMuted }}>Pipeline:</span>
                          <span className="font-medium tabular-nums" style={{ color: theme.text }}>
                            {formatCurrency(d?.pipeline || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="pipeline"
                stroke={theme.textMuted}
                strokeWidth={1.5}
                fill={`url(#${pipelineGradientId})`}
              />
              <Area
                type="monotone"
                dataKey="closed"
                stroke={theme.accent}
                strokeWidth={2}
                fill={`url(#${closedGradientId})`}
              />
              <ReferenceDot
                x={currentMonth.name}
                y={currentMonth.closed}
                r={4}
                fill={theme.accent}
                stroke={theme.bg}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div
          className="mt-5 pt-4 flex items-center gap-6"
          style={{ borderTop: `1px solid ${theme.accentSoft}` }}
        >
          <div className="flex items-center gap-2 text-[11px]">
            <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.accent }} />
            <span style={{ color: theme.textMuted }}>Sold Revenue</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.textMuted }} />
            <span style={{ color: theme.textMuted }}>Pipeline Value</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
