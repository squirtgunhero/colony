"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/date-utils";
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

interface Deal {
  id: string;
  title: string;
  stage: string;
  value: number | null;
  createdAt: Date;
}

interface DealsTrendChartProps {
  deals: Deal[];
}

export function DealsTrendChart({ deals }: DealsTrendChartProps) {
  const today = new Date();
  const currentMonthIndex = 5; // Last position in our 6-month array

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
    const monthDeals = deals.filter((deal) =>
      isWithinInterval(new Date(deal.createdAt), { start, end })
    );
    const closedDeals = monthDeals.filter((d) => d.stage === "closed");
    const totalValue = monthDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    const closedValue = closedDeals.reduce((sum, d) => sum + (d.value || 0), 0);

    return {
      name: month,
      pipeline: totalValue,
      closed: closedValue,
      deals: monthDeals.length,
      isCurrentMonth,
    };
  });

  const totalClosed = data.reduce((sum, d) => sum + d.closed, 0);
  const currentMonth = data[data.length - 1];

  return (
    <Card>
      {/* Header - Editorial */}
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-overline mb-1">Revenue Trend</p>
            <p className="metric-value-lg">{formatCurrency(totalClosed)}</p>
            <p className="text-caption mt-0.5">Total closed (6 months)</p>
          </div>
          {/* Current month highlight */}
          <div className="text-right p-3 rounded-xl bg-muted/30">
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
                <linearGradient id="gradientClosed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#171717" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#171717" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradientPipeline" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a3a3a3" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#a3a3a3" stopOpacity={0} />
                </linearGradient>
              </defs>
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
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="bg-card border border-[rgba(0,0,0,0.06)] rounded-lg p-3 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                      <p className="text-[13px] font-semibold mb-2">{label}</p>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-[11px]">
                          <div className="h-2 w-2 rounded-full bg-[#171717]" />
                          <span className="text-muted-foreground">Closed:</span>
                          <span className="font-semibold tabular-nums">{formatCurrency(d?.closed || 0)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <div className="h-2 w-2 rounded-full bg-[#a3a3a3]" />
                          <span className="text-muted-foreground">Pipeline:</span>
                          <span className="font-medium tabular-nums">{formatCurrency(d?.pipeline || 0)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="pipeline"
                stroke="#d4d4d4"
                strokeWidth={1.5}
                fill="url(#gradientPipeline)"
              />
              <Area
                type="monotone"
                dataKey="closed"
                stroke="#171717"
                strokeWidth={2}
                fill="url(#gradientClosed)"
              />
              {/* Current month marker */}
              <ReferenceDot
                x={currentMonth.name}
                y={currentMonth.closed}
                r={4}
                fill="#171717"
                stroke="#fff"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-5 pt-4 border-t border-[rgba(0,0,0,0.04)] flex items-center gap-6">
          <div className="flex items-center gap-2 text-[11px]">
            <div className="h-0.5 w-4 rounded-full bg-[#171717]" />
            <span className="text-muted-foreground">Closed Revenue</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <div className="h-0.5 w-4 rounded-full bg-[#d4d4d4]" />
            <span className="text-muted-foreground">Pipeline Value</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
