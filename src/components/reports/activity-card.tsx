import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Target, CheckCircle2, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Deal {
  id: string;
  title: string;
  value: number | null;
  stage: string;
  createdAt: Date;
  contact: { name: string } | null;
  property: { address: string; city: string } | null;
}

interface ActivityCardProps {
  recentDeals: Deal[];
}

const stageIcons: Record<string, typeof Target> = {
  new_lead: Target,
  qualified: Zap,
  showing: Clock,
  offer: Activity,
  negotiation: Clock,
  closed: CheckCircle2,
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d`;
  if (diffHours > 0) return `${diffHours}h`;
  if (diffMins > 0) return `${diffMins}m`;
  return "now";
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

export function ActivityCard({ recentDeals }: ActivityCardProps) {
  return (
    <Card className="h-full overflow-hidden border-neutral-200">
      <div className="h-full p-5 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900/5">
            <Activity className="h-4 w-4 text-neutral-700" />
          </div>
          <span className="font-semibold">Recent Activity</span>
        </div>

        {recentDeals.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-neutral-500 text-sm">
            No recent activity
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-3 min-w-max">
              {recentDeals.slice(0, 8).map((deal, index) => {
                const StageIcon = stageIcons[deal.stage] || Target;

                return (
                  <div
                    key={deal.id}
                    className={cn(
                      "flex-shrink-0 w-48 p-3 rounded-xl transition-colors",
                      index === 0 
                        ? "bg-neutral-900 text-white" 
                        : "bg-neutral-100 hover:bg-neutral-200"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className={cn(
                        "h-2 w-2 rounded-full mt-1.5",
                        index === 0 ? "bg-white" : "bg-neutral-900"
                      )} />
                      <span className={cn(
                        "text-xs",
                        index === 0 ? "text-neutral-400" : "text-neutral-500"
                      )}>
                        {formatTimeAgo(deal.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                      <StageIcon className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        index === 0 ? "text-neutral-400" : "text-neutral-500"
                      )} />
                      <span className="font-medium text-sm truncate">{deal.title}</span>
                    </div>

                    <p className={cn(
                      "text-xs truncate mb-2",
                      index === 0 ? "text-neutral-400" : "text-neutral-500"
                    )}>
                      {deal.contact?.name || "Unknown"}
                    </p>

                    <div className="flex items-center justify-between">
                      {deal.value && deal.value > 0 && (
                        <span className={cn(
                          "text-sm font-semibold",
                          index === 0 ? "text-white" : "text-neutral-900"
                        )}>
                          {formatCurrency(deal.value)}
                        </span>
                      )}
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-xs capitalize rounded-full ml-auto",
                          index === 0 && "bg-white/10 text-white border-0"
                        )}
                      >
                        {(deal.stage ?? "").replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
