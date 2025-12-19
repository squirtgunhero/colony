import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface RevenueCardProps {
  revenue: number;
  closedDeals: number;
  growthPercent?: number;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

export function RevenueCard({ revenue, closedDeals, growthPercent }: RevenueCardProps) {
  return (
    <Card className="h-full overflow-hidden bg-foreground text-background border-0 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-background blur-3xl" />
        <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-background blur-2xl" />
      </div>

      <div className="relative h-full p-5 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/10 backdrop-blur-sm">
            <TrendingUp className="h-5 w-5" />
          </div>
          {growthPercent !== undefined && (
            <div className="flex items-center gap-1 text-xs font-medium bg-background/10 backdrop-blur-sm rounded-full px-2.5 py-1">
              <TrendingUp className="h-3 w-3" />
              {growthPercent > 0 ? '+' : ''}{growthPercent}%
            </div>
          )}
        </div>

        <div>
          <p className="text-background/60 text-sm mb-1">Total Revenue</p>
          <p className="text-4xl font-bold tracking-tight">{formatCurrency(revenue)}</p>
          <p className="text-background/60 text-sm mt-2">
            {closedDeals} deal{closedDeals !== 1 ? 's' : ''} closed
          </p>
        </div>
      </div>
    </Card>
  );
}
