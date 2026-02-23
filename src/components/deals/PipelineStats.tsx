"use client";

import { useColonyTheme } from "@/lib/chat-theme-context";
import { formatCurrency } from "@/lib/date-utils";

interface Deal {
  id: string;
  stage: string;
  value: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface PipelineStatsProps {
  deals: Deal[];
}

export function PipelineStats({ deals }: PipelineStatsProps) {
  const { theme } = useColonyTheme();

  const activeDeals = deals.filter((d) => d.stage !== "closed");
  const closedWon = deals.filter((d) => d.stage === "closed");
  const totalDeals = deals.length;

  const totalPipeline = activeDeals.reduce((s, d) => s + (d.value || 0), 0);
  const avgDealSize =
    totalDeals > 0
      ? deals.reduce((s, d) => s + (d.value || 0), 0) / totalDeals
      : 0;

  const conversionRate =
    totalDeals > 0
      ? Math.round((closedWon.length / totalDeals) * 100)
      : 0;

  const avgDaysToClose = (() => {
    if (closedWon.length === 0) return 0;
    const totalDays = closedWon.reduce((sum, d) => {
      const created = new Date(d.createdAt).getTime();
      const updated = new Date(d.updatedAt).getTime();
      return sum + (updated - created) / (1000 * 60 * 60 * 24);
    }, 0);
    return Math.round(totalDays / closedWon.length);
  })();

  const stats = [
    { label: "Pipeline Value", value: formatCurrency(totalPipeline) },
    { label: "Avg Deal Size", value: formatCurrency(avgDealSize) },
    { label: "Avg Days to Close", value: avgDaysToClose > 0 ? `${avgDaysToClose}d` : "—" },
    { label: "Conversion Rate", value: `${conversionRate}%` },
  ];

  const neumorphicRaised = `4px 4px 8px rgba(0,0,0,0.4), -4px -4px 8px rgba(255,255,255,0.04)`;

  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl mt-6"
      style={{
        backgroundColor: theme.bgGlow,
        boxShadow: neumorphicRaised,
      }}
    >
      {stats.map((stat) => (
        <div key={stat.label}>
          <p
            className="text-xs mb-1"
            style={{ color: theme.textMuted, fontFamily: "'DM Sans', sans-serif" }}
          >
            {stat.label}
          </p>
          <p
            className="text-lg font-semibold"
            style={{ color: theme.text, fontFamily: "'DM Sans', sans-serif" }}
          >
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
