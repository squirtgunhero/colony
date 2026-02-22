"use client";

import { Users, Clock, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { formatCurrency } from "@/lib/date-utils";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  stats: {
    pipelineValue: number;
    previousPipelineValue: number;
    leadsCount: number;
    pendingTasks: number;
  };
}

export function DashboardHeader({ stats }: DashboardHeaderProps) {
  const { theme } = useColonyTheme();

  const percentageChange = stats.previousPipelineValue > 0
    ? ((stats.pipelineValue - stats.previousPipelineValue) / stats.previousPipelineValue) * 100
    : stats.pipelineValue > 0 ? 100 : 0;

  const isPositive = percentageChange > 0;
  const hasChange = percentageChange !== 0;

  return (
    <header style={{
      backgroundColor: theme.bgGlow,
      borderBottom: `1px solid ${theme.accentSoft}`,
    }}>
      <div className="px-6 lg:px-8 py-8 lg:py-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="space-y-1">
            <p className="text-overline" style={{ color: theme.textMuted }}>Total Pipeline Value</p>
            <div className="flex items-baseline gap-4">
              <span className="metric-hero" style={{ color: theme.text }}>
                {formatCurrency(stats.pipelineValue)}
              </span>
              {hasChange ? (
                <span
                  className={cn("metric-delta px-2.5 py-1 rounded-full")}
                  style={{
                    backgroundColor: theme.accentGlow,
                    color: isPositive ? theme.accent : theme.text,
                  }}
                >
                  {isPositive ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  )}
                  {Math.abs(percentageChange).toFixed(1)}%
                </span>
              ) : (
                <span
                  className="metric-delta px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: theme.surface, color: theme.textMuted }}
                >
                  <Minus className="h-3.5 w-3.5" />
                  0%
                </span>
              )}
            </div>
            <p className="text-caption mt-1" style={{ color: theme.textMuted }}>
              vs. previous month
            </p>
          </div>

          <div className="flex items-center gap-6 lg:gap-10">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: theme.surface }}
              >
                <Users className="h-4.5 w-4.5" style={{ color: theme.textMuted }} />
              </div>
              <div>
                <p className="metric-value" style={{ color: theme.text }}>{stats.leadsCount}</p>
                <p className="text-overline mt-0.5" style={{ color: theme.textMuted }}>Active Leads</p>
              </div>
            </div>

            <div
              className="hidden lg:block h-12 w-px"
              style={{ backgroundColor: theme.accentSoft }}
            />

            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: theme.surface }}
              >
                <Clock className="h-4.5 w-4.5" style={{ color: theme.textMuted }} />
              </div>
              <div>
                <p className="metric-value" style={{ color: theme.text }}>{stats.pendingTasks}</p>
                <p className="text-overline mt-0.5" style={{ color: theme.textMuted }}>Pending Tasks</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
