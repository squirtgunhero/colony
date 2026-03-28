"use client";

import { useState, useEffect } from "react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { TrendingUp, DollarSign, Target, Clock } from "lucide-react";

interface ForecastSummary {
  totalPipeline: number;
  weightedPipeline: number;
  dealCount: number;
  avgDealSize: number;
  avgProbability: number;
  winRate: number;
  avgCycleLength: number;
  byStage: Array<{
    stage: string;
    count: number;
    totalValue: number;
    weightedValue: number;
    probability: number;
  }>;
}

function formatValue(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  if (v > 0) return `$${v.toLocaleString()}`;
  return "$0";
}

export function ForecastBar() {
  const { theme } = useColonyTheme();
  const [forecast, setForecast] = useState<ForecastSummary | null>(null);

  useEffect(() => {
    fetch("/api/forecast")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setForecast(data); })
      .catch(() => {});
  }, []);

  if (!forecast || forecast.dealCount === 0) return null;

  

  const metrics = [
    { icon: DollarSign, label: "Pipeline", value: formatValue(forecast.totalPipeline) },
    { icon: TrendingUp, label: "Weighted", value: formatValue(forecast.weightedPipeline) },
    { icon: Target, label: "Win Rate", value: `${Math.round(forecast.winRate)}%` },
    { icon: Clock, label: "Avg Cycle", value: forecast.avgCycleLength > 0 ? `${Math.round(forecast.avgCycleLength)}d` : "—" },
  ];

  return (
    <div className="mb-6 space-y-4">
      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metrics.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="rounded-xl p-3"
            style={{ backgroundColor: theme.bgGlow, boxShadow: "none" }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon className="h-3.5 w-3.5" style={{ color: theme.accent }} />
              <span className="text-[11px] font-medium" style={{ color: theme.textMuted }}>
                {label}
              </span>
            </div>
            <span className="text-lg font-semibold" style={{ color: theme.text }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Stage funnel */}
      {forecast.byStage.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: theme.bgGlow, boxShadow: "none" }}
        >
          <h3 className="text-xs font-semibold mb-3" style={{ color: theme.textMuted }}>
            Pipeline by Stage
          </h3>
          <div className="space-y-2">
            {forecast.byStage.map((stage) => {
              const pct = forecast.totalPipeline > 0 ? (stage.totalValue / forecast.totalPipeline) * 100 : 0;
              return (
                <div key={stage.stage} className="flex items-center gap-3">
                  <span
                    className="text-xs w-24 truncate capitalize"
                    style={{ color: theme.text, fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {stage.stage.replace(/_/g, " ")}
                  </span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: withAlpha(theme.text, 0.06) }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(2, pct)}%`, backgroundColor: theme.accent }}
                    />
                  </div>
                  <span className="text-xs w-16 text-right" style={{ color: theme.textMuted }}>
                    {formatValue(stage.totalValue)}
                  </span>
                  <span className="text-[10px] w-8 text-right" style={{ color: theme.textMuted }}>
                    {stage.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
