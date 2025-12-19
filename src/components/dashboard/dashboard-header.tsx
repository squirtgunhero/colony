"use client";

import { TrendingUp, Users, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatCurrency } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  stats: {
    pipelineValue: number;
    leadsCount: number;
    pendingTasks: number;
  };
}

export function DashboardHeader({ stats }: DashboardHeaderProps) {
  return (
    <header className="border-b border-[rgba(0,0,0,0.04)] dark:border-[rgba(255,255,255,0.04)] bg-card">
      <div className="px-6 lg:px-8 py-8 lg:py-10">
        {/* Hero Metric - Pipeline Value */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          {/* Primary: Pipeline Value */}
          <div className="space-y-1">
            <p className="text-overline">Total Pipeline Value</p>
            <div className="flex items-baseline gap-4">
              <span className="metric-hero">
                {formatCurrency(stats.pipelineValue)}
              </span>
              {/* Delta indicator */}
              <span className={cn(
                "metric-delta metric-delta-up",
                "bg-[rgba(61,122,74,0.08)] dark:bg-[rgba(74,222,128,0.1)]",
                "px-2.5 py-1 rounded-full"
              )}>
                <ArrowUpRight className="h-3.5 w-3.5" />
                12.4%
              </span>
            </div>
            <p className="text-caption mt-1">
              vs. previous month
            </p>
          </div>

          {/* Secondary: Supporting Metrics */}
          <div className="flex items-center gap-6 lg:gap-10">
            {/* Active Leads */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/40">
                <Users className="h-4.5 w-4.5 text-muted-foreground" />
              </div>
              <div>
                <p className="metric-value">{stats.leadsCount}</p>
                <p className="text-overline mt-0.5">Active Leads</p>
              </div>
            </div>

            {/* Divider */}
            <div className="hidden lg:block h-12 w-px bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.06)]" />

            {/* Pending Tasks */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/40">
                <Clock className="h-4.5 w-4.5 text-muted-foreground" />
              </div>
              <div>
                <p className="metric-value">{stats.pendingTasks}</p>
                <p className="text-overline mt-0.5">Pending Tasks</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

