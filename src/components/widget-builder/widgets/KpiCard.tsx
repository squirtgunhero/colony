"use client";

/**
 * KPI Card Widget
 * Displays a key metric with count and optional trend indicator
 */

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Users, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { dataProvider } from "@/lib/widget-builder";
import type { KpiCardProps } from "@/lib/widget-builder";
import { cn } from "@/lib/utils";

interface KpiCardWidgetProps {
  id: string;
  props: KpiCardProps;
}

export function KpiCard({ props }: KpiCardWidgetProps) {
  const { label, metric, dateRange } = props;
  
  // Calculate the metric value
  const { value, formattedValue, trend } = useMemo(() => {
    let val = 0;
    
    switch (metric) {
      case "new_leads":
        val = dataProvider.getLeadCount({ 
          dateRange: dateRange ? { days: dateRange.days } : undefined 
        });
        break;
      case "total_leads":
        val = dataProvider.getLeadCount({});
        break;
      case "deals_value":
        val = dataProvider.getDealsValue({ 
          dateRange: dateRange ? { days: dateRange.days } : undefined 
        });
        break;
    }
    
    // Format the value
    const formatted = metric === "deals_value"
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          notation: "compact",
          maximumFractionDigits: 1,
        }).format(val)
      : val.toString();
    
    // Simulate trend (in real app, would compare to previous period)
    const trendValue = Math.random() > 0.5 ? 12 : -8;
    
    return {
      value: val,
      formattedValue: formatted,
      trend: trendValue,
    };
  }, [metric, dateRange]);
  
  const Icon = metric === "deals_value" ? DollarSign : Users;
  const TrendIcon = trend >= 0 ? TrendingUp : TrendingDown;
  
  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardContent className="flex-1 p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
            trend >= 0 
              ? "text-success bg-success/10" 
              : "text-destructive bg-destructive/10"
          )}>
            <TrendIcon className="h-3 w-3" />
            <span>{Math.abs(trend)}%</span>
          </div>
        </div>
        
        <div className="mt-4">
          <p className="text-2xl font-bold tracking-tight font-display">
            {formattedValue}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {label}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

