import { TrendingUp, Users, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatCurrency } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

interface StatsBarProps {
  stats: {
    pipelineValue: number;
    leadsCount: number;
    pendingTasks: number;
  };
}

interface MetricPillProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  delta?: {
    value: string;
    trend: "up" | "down";
  };
  className?: string;
}

function MetricPill({ icon, label, value, delta, className }: MetricPillProps) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2.5 rounded-xl",
      "bg-card border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]",
      "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
      className
    )}>
      {/* Icon container - subtle, not prominent */}
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50">
        {icon}
      </div>
      <div className="flex flex-col">
        {/* Overline label */}
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {/* Value with accent numeral font */}
          <span className="text-lg font-semibold tracking-tight font-[family-name:var(--font-display)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {value}
          </span>
          {/* Delta indicator */}
          {delta && (
            <span className={cn(
              "flex items-center text-xs font-medium",
              delta.trend === "up" 
                ? "text-[#3d7a4a] dark:text-[#4ade80]" 
                : "text-[#b91c1c] dark:text-[#dc2626]"
            )}>
              {delta.trend === "up" ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {delta.value}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function StatsBar({ stats }: StatsBarProps) {
  return (
    <>
      {/* Mobile Stats - Horizontal scroll */}
      <div className="flex lg:hidden gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        <MetricPill
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          label="Pipeline"
          value={formatCurrency(stats.pipelineValue)}
          className="shrink-0"
        />
        <MetricPill
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          label="Leads"
          value={stats.leadsCount}
          className="shrink-0"
        />
        <MetricPill
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          label="Tasks"
          value={stats.pendingTasks}
          className="shrink-0"
        />
      </div>

      {/* Desktop Stats */}
      <div className="hidden lg:flex items-center gap-3">
        <MetricPill
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          label="Pipeline"
          value={formatCurrency(stats.pipelineValue)}
          delta={{ value: "12%", trend: "up" }}
        />
        <MetricPill
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          label="Leads"
          value={stats.leadsCount}
          delta={{ value: "3", trend: "up" }}
        />
        <MetricPill
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          label="Pending"
          value={stats.pendingTasks}
        />
      </div>
    </>
  );
}
