"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon, Info } from "lucide-react";

interface PageShellProps {
  title: string;
  subtitle: string;
  ctaLabel?: string;
  ctaIcon?: LucideIcon;
  onCtaClick?: () => void;
  children?: React.ReactNode;
}

export function PageShell({
  title,
  subtitle,
  ctaLabel,
  ctaIcon: CtaIcon,
  onCtaClick,
  children,
}: PageShellProps) {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-[#1f1f1f] bg-[#0c0c0c]">
        <div className="px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-white tracking-tight">
                {title}
              </h1>
              <p className="mt-1 text-sm text-neutral-400">{subtitle}</p>
            </div>
            {ctaLabel && (
              <Button
                onClick={onCtaClick}
                className="bg-amber-500 hover:bg-amber-600 text-black font-medium shrink-0"
              >
                {CtaIcon && <CtaIcon className="h-4 w-4 mr-2" />}
                {ctaLabel}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 lg:px-8 py-8">{children}</div>
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value?: string | number;
  trend?: string;
  trendUp?: boolean;
  loading?: boolean;
}

export function KpiCard({ label, value, trend, trendUp, loading }: KpiCardProps) {
  const hasData = value !== undefined && value !== null && value !== "";
  
  return (
    <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
          {label}
        </span>
        {!hasData && (
          <div className="group relative">
            <Info className="h-3.5 w-3.5 text-neutral-600 cursor-help" />
            <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg text-xs text-neutral-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Connect integrations to see metrics
            </div>
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        {loading ? (
          <div className="h-8 w-20 bg-[#1f1f1f] rounded animate-pulse" />
        ) : hasData ? (
          <>
            <span className="text-2xl font-semibold text-white tabular-nums">
              {value}
            </span>
            {trend && (
              <span
                className={cn(
                  "text-xs font-medium",
                  trendUp ? "text-emerald-400" : "text-red-400"
                )}
              >
                {trend}
              </span>
            )}
          </>
        ) : (
          <span className="text-2xl font-semibold text-neutral-600">—</span>
        )}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaIcon?: LucideIcon;
  onCtaClick?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaIcon: CtaIcon,
  onCtaClick,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1f1f1f] mb-4">
        <Icon className="h-8 w-8 text-neutral-500" />
      </div>
      <h3 className="text-lg font-medium text-white mb-1">{title}</h3>
      <p className="text-sm text-neutral-400 text-center max-w-sm mb-6">
        {description}
      </p>
      {ctaLabel && (
        <Button
          onClick={onCtaClick}
          className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
        >
          {CtaIcon && <CtaIcon className="h-4 w-4 mr-2" />}
          {ctaLabel}
        </Button>
      )}
    </div>
  );
}

interface DataTableShellProps {
  columns: string[];
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  ctaLabel?: string;
  ctaIcon?: LucideIcon;
  onCtaClick?: () => void;
}

export function DataTableShell({
  columns,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  ctaLabel,
  ctaIcon,
  onCtaClick,
}: DataTableShellProps) {
  return (
    <div className="bg-[#161616] border border-[#1f1f1f] rounded-xl overflow-hidden">
      {/* Table Header */}
      <div className="border-b border-[#1f1f1f]">
        <div className="grid gap-4 px-5 py-3" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
          {columns.map((col) => (
            <span key={col} className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
              {col}
            </span>
          ))}
        </div>
      </div>

      {/* Empty State */}
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        ctaLabel={ctaLabel}
        ctaIcon={ctaIcon}
        onCtaClick={onCtaClick}
      />
    </div>
  );
}

