import { Card } from "@/components/ui/card";
import { UserPlus, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadsCardProps {
  newLeads: number;
  totalContacts: number;
  growth: number;
}

export function LeadsCard({ newLeads, totalContacts, growth }: LeadsCardProps) {
  const isPositive = growth >= 0;

  return (
    <Card className="h-full overflow-hidden bg-neutral-100 border-neutral-200 relative">
      <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-neutral-200/50 blur-xl" />

      <div className="relative h-full p-4 flex flex-col justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900/5">
          <UserPlus className="h-4 w-4 text-neutral-700" />
        </div>

        <div>
          <p className="text-5xl font-bold text-neutral-900">{newLeads}</p>
          <p className="text-neutral-500 text-xs mt-1">New Leads</p>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-400">{totalContacts} total</span>
          <div className={cn(
            "flex items-center gap-0.5 text-xs font-medium",
            isPositive ? "text-neutral-900" : "text-neutral-500"
          )}>
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(growth)}%
          </div>
        </div>
      </div>
    </Card>
  );
}
