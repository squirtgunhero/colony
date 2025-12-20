"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ArrowUpRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: string;
  createdAt: Date;
  properties: { address: string; city: string }[];
  deals: { value: number | null; stage?: string }[];
}

interface LeadCardsProps {
  leads: Lead[];
  selectedLeadId?: string;
}

type LeadStage = "new" | "contacted" | "qualified" | "negotiating";

// Semantic colors - Muted, sophisticated
const stageConfig: Record<LeadStage, { label: string; className: string }> = {
  new: { 
    label: "New", 
    className: "bg-[rgba(74,111,165,0.08)] text-[#4a6fa5] dark:bg-[rgba(96,165,250,0.1)] dark:text-[#60a5fa]" 
  },
  contacted: { 
    label: "Contacted", 
    className: "bg-[rgba(180,83,9,0.08)] text-[#b45309] dark:bg-[rgba(251,146,60,0.1)] dark:text-[#fb923c]" 
  },
  qualified: { 
    label: "Qualified", 
    className: "bg-[rgba(61,122,74,0.08)] text-[#3d7a4a] dark:bg-[rgba(74,222,128,0.1)] dark:text-[#4ade80]" 
  },
  negotiating: { 
    label: "Negotiating", 
    className: "bg-[rgba(107,107,107,0.08)] text-[#6b6b6b] dark:bg-[rgba(138,138,138,0.1)] dark:text-[#8a8a8a]" 
  },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getStage(index: number): LeadStage {
  const stages: LeadStage[] = ["new", "contacted", "qualified", "negotiating"];
  return stages[index % stages.length];
}

export function LeadCards({ leads, selectedLeadId }: LeadCardsProps) {
  if (leads.length === 0) {
    return (
      <div className="composite-surface">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-14 w-14 rounded-2xl bg-muted/40 flex items-center justify-center mb-5">
            <ArrowUpRight className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-title-sm text-foreground mb-1">No active contacts</p>
          <p className="text-caption">Create your first contact to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="composite-surface space-y-6">
      {/* Section Header - Clean, no border */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-title">Active Contacts</h2>
          <p className="text-caption mt-1">
            {leads.length} contact{leads.length !== 1 ? "s" : ""} in pipeline
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 text-[12px] gap-1.5 text-muted-foreground hover:text-foreground"
        >
          View All
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Lead List - Vertical rhythm, no grid */}
      <div className="space-y-1">
        {leads.slice(0, 6).map((lead, index) => {
          const dealValue = lead.deals[0]?.value;
          const property = lead.properties[0];
          const stage = getStage(index);
          const config = stageConfig[stage];
          const isSelected = lead.id === selectedLeadId;

          return (
            <div
              key={lead.id}
              className={cn(
                "group flex items-center gap-4 p-4 -mx-2 rounded-xl cursor-pointer",
                "transition-all duration-200 ease-out",
                isSelected 
                  ? "ambient-selected bg-[rgba(194,65,12,0.02)] dark:bg-[rgba(234,88,12,0.03)]" 
                  : "hover:bg-muted/30"
              )}
            >
              {/* Avatar */}
              <Avatar className={cn(
                "h-11 w-11 shrink-0 transition-transform duration-200",
                isSelected ? "ring-2 ring-primary/20" : ""
              )}>
                <AvatarFallback className="text-[13px] font-semibold bg-muted text-muted-foreground">
                  {getInitials(lead.name)}
                </AvatarFallback>
              </Avatar>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-[14px] font-semibold text-foreground truncate">
                    {lead.name}
                  </h3>
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide shrink-0",
                    config.className
                  )}>
                    {config.label}
                  </span>
                </div>
                <p className="text-[13px] text-muted-foreground truncate mt-0.5">
                  {property?.city || "No location"}
                </p>
              </div>

              {/* Value */}
              <div className="text-right shrink-0">
                <p className="text-[15px] font-semibold tracking-tight font-[family-name:var(--font-display)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {dealValue ? formatCurrency(dealValue) : "—"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {formatDate(lead.createdAt)}
                </p>
              </div>

              {/* Actions - Reveal on hover */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>

      {/* Footer - Subtle load more */}
      {leads.length > 6 && (
        <div className="pt-2 border-t border-[rgba(0,0,0,0.04)] dark:border-[rgba(255,255,255,0.04)]">
          <Button 
            variant="ghost" 
            className="w-full h-10 text-[13px] text-muted-foreground hover:text-foreground"
          >
            Show {leads.length - 6} more contacts
          </Button>
        </div>
      )}
    </div>
  );
}
