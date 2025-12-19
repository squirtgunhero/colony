import { Card } from "@/components/ui/card";
import { Target, ArrowUpRight } from "lucide-react";

interface PipelineCardProps {
  value: number;
  activeDeals: number;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

export function PipelineCard({ value, activeDeals }: PipelineCardProps) {
  return (
    <Card className="h-full overflow-hidden bg-neutral-900 text-white border-0 relative">
      {/* Background accent */}
      <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-white/5 blur-xl" />

      <div className="relative h-full p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <p className="text-neutral-400 text-xs mb-0.5">Pipeline Value</p>
            <p className="text-2xl font-bold">{formatCurrency(value)}</p>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-1 text-neutral-400 text-sm">
            <ArrowUpRight className="h-4 w-4" />
            <span>{activeDeals} active</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
