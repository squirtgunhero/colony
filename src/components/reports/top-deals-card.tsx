import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Crown, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

interface Deal {
  id: string;
  title: string;
  value: number | null;
  stage: string;
  contact: { name: string } | null;
  property: { address: string; city: string } | null;
}

interface TopDealsCardProps {
  recentDeals: Deal[];
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

const rankStyles = [
  { bg: "bg-neutral-900", icon: Crown, iconColor: "text-white" },
  { bg: "bg-neutral-600", icon: Medal, iconColor: "text-white" },
  { bg: "bg-neutral-400", icon: Trophy, iconColor: "text-white" },
];

export function TopDealsCard({ recentDeals }: TopDealsCardProps) {
  const topDeals = [...recentDeals]
    .filter((d) => d.value && d.value > 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0))
    .slice(0, 5);

  return (
    <Card className="h-full overflow-hidden border-neutral-200">
      <div className="h-full p-5 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900">
            <Trophy className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold">Top Deals</span>
        </div>

        {topDeals.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-neutral-500 text-sm">
            No deals available
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {topDeals.map((deal, index) => {
              const style = rankStyles[index];
              const RankIcon = style?.icon;

              return (
                <div
                  key={deal.id}
                  className={cn(
                    "relative rounded-2xl p-4 flex flex-col transition-colors",
                    index === 0 
                      ? "bg-neutral-900 text-white" 
                      : "bg-neutral-100 hover:bg-neutral-200"
                  )}
                >
                  {/* Rank Badge */}
                  {index < 3 && (
                    <div className={cn(
                      "absolute -top-2 -right-2 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shadow-sm",
                      style?.bg
                    )}>
                      {RankIcon && (
                        <RankIcon className={cn("h-3.5 w-3.5", style?.iconColor)} />
                      )}
                    </div>
                  )}

                  {/* Avatar */}
                  <Avatar className="h-10 w-10 mb-3">
                    <AvatarFallback className={cn(
                      "text-sm font-medium",
                      index === 0 
                        ? "bg-white text-neutral-900" 
                        : "bg-neutral-900 text-white"
                    )}>
                      {deal.contact ? getInitials(deal.contact.name) : "??"}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1">
                    <p className="font-medium text-sm truncate">{deal.title}</p>
                    <p className={cn(
                      "text-xs truncate",
                      index === 0 ? "text-neutral-400" : "text-neutral-500"
                    )}>
                      {deal.contact?.name || "Unknown"}
                    </p>
                  </div>

                  {/* Value */}
                  <div className={cn(
                    "mt-3 pt-3 border-t",
                    index === 0 ? "border-neutral-700" : "border-neutral-200"
                  )}>
                    <p className={cn(
                      "text-lg font-bold",
                      index === 0 ? "text-white" : "text-neutral-900"
                    )}>
                      {formatCurrency(deal.value || 0)}
                    </p>
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-xs mt-1 rounded-full capitalize",
                        index === 0 && "bg-white/10 text-white border-0"
                      )}
                    >
                      {deal.stage.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
