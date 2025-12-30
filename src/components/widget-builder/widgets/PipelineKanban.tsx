"use client";

/**
 * Pipeline Kanban Widget
 * Displays deals in a kanban board grouped by stage
 */

import { useMemo } from "react";
import { format } from "date-fns";
import { GripVertical, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { dataProvider } from "@/lib/widget-builder";
import type { PipelineKanbanProps, DealStage, Deal } from "@/lib/widget-builder";
import { cn } from "@/lib/utils";

interface PipelineKanbanWidgetProps {
  id: string;
  props: PipelineKanbanProps;
}

// Stage configuration
const stageConfig: Record<DealStage, { label: string; color: string; bgColor: string }> = {
  discovery: { 
    label: "Discovery", 
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/20"
  },
  proposal: { 
    label: "Proposal", 
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-500/10 border-purple-500/20"
  },
  negotiation: { 
    label: "Negotiation", 
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-500/20"
  },
  closed_won: { 
    label: "Closed Won", 
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-500/10 border-green-500/20"
  },
  closed_lost: { 
    label: "Closed Lost", 
    color: "text-gray-500 dark:text-gray-400",
    bgColor: "bg-gray-500/10 border-gray-500/20"
  },
};

// Stage order for display
const stageOrder: DealStage[] = [
  "discovery",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
];

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

// Deal card component
function DealCard({ deal }: { deal: Deal }) {
  return (
    <div className="group p-3 bg-background rounded-lg border border-border/50 hover:border-border hover:shadow-sm transition-all cursor-pointer">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{deal.name}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs font-semibold text-primary flex items-center gap-0.5">
              <DollarSign className="h-3 w-3" />
              {formatCurrency(deal.value)}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(deal.createdAt, "MMM d")}
            </span>
          </div>
        </div>
        <GripVertical className="h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

// Stage column component
function StageColumn({ 
  stage, 
  deals 
}: { 
  stage: DealStage; 
  deals: Deal[];
}) {
  const config = stageConfig[stage];
  const totalValue = deals.reduce((sum, d) => sum + d.value, 0);
  
  return (
    <div className="flex-1 min-w-[200px] flex flex-col">
      <div className={cn(
        "px-3 py-2 rounded-lg border mb-3",
        config.bgColor
      )}>
        <div className="flex items-center justify-between">
          <span className={cn("text-xs font-semibold", config.color)}>
            {config.label}
          </span>
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
            {deals.length}
          </Badge>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {formatCurrency(totalValue)}
        </p>
      </div>
      
      <div className="flex-1 space-y-2 overflow-hidden">
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
        
        {deals.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground border border-dashed rounded-lg">
            No deals
          </div>
        )}
      </div>
    </div>
  );
}

export function PipelineKanban({ props }: PipelineKanbanWidgetProps) {
  const { title, dateRange } = props;
  
  // Get filtered deals grouped by stage
  const dealsByStage = useMemo(() => {
    const deals = dataProvider.getDeals({
      dateRange: dateRange ? { days: dateRange.days } : undefined,
    });
    
    const grouped: Record<DealStage, Deal[]> = {
      discovery: [],
      proposal: [],
      negotiation: [],
      closed_won: [],
      closed_lost: [],
    };
    
    deals.forEach((deal) => {
      grouped[deal.stage].push(deal);
    });
    
    return grouped;
  }, [dateRange]);
  
  const totalDeals = Object.values(dealsByStage).flat().length;
  
  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <span className="text-xs text-muted-foreground">
            {totalDeals} deal{totalDeals !== 1 ? "s" : ""}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4 pt-0 overflow-hidden">
        <div className="h-full overflow-x-auto">
          <div className="flex gap-4 h-full pb-4 min-w-max">
            {stageOrder.map((stage) => (
              <StageColumn
                key={stage}
                stage={stage}
                deals={dealsByStage[stage]}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

