"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Calendar,
  ExternalLink,
  MessageSquare,
  Video,
  FileText,
  ChevronRight,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: string;
  notes: string | null;
  createdAt: Date;
  properties: { address: string; city: string }[];
  deals: { value: number | null }[];
}

interface LeadDetailPanelProps {
  lead: Lead | null;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface DetailFieldProps {
  label: string;
  value: string | React.ReactNode;
  editable?: boolean;
}

function DetailField({ label, value, editable = true }: DetailFieldProps) {
  return (
    <div className="group flex items-start justify-between py-3">
      <div className="space-y-1">
        <p className="text-overline">{label}</p>
        <div className="text-[14px] font-medium text-foreground">{value}</div>
      </div>
      {editable && (
        <button className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1.5 rounded-lg hover:bg-muted/50 mt-1">
          <Pencil className="h-3 w-3 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

export function LeadDetailPanel({ lead }: LeadDetailPanelProps) {
  if (!lead) {
    return (
      <aside className="inspector-drawer hidden xl:flex flex-col">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-[200px]">
            <div className="h-14 w-14 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-title-sm text-foreground mb-1">No lead selected</p>
            <p className="text-caption">Select a lead from the list to view details</p>
          </div>
        </div>
      </aside>
    );
  }

  const property = lead.properties[0];
  const dealValue = lead.deals[0]?.value;

  return (
    <aside className="inspector-drawer hidden xl:flex flex-col">
      {/* Header - Minimal */}
      <div className="flex items-center justify-between h-14 px-6 border-b border-[rgba(0,0,0,0.04)] dark:border-[rgba(255,255,255,0.04)] shrink-0">
        <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Inspector</h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-auto">
        {/* Identity Section - Reduced avatar emphasis */}
        <div className="px-6 py-6 border-b border-[rgba(0,0,0,0.04)] dark:border-[rgba(255,255,255,0.04)]">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarFallback className="text-[14px] font-semibold bg-foreground text-background">
                {getInitials(lead.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-title truncate">{lead.name}</h2>
              <p className="text-caption mt-0.5 truncate">
                {lead.type === "lead" ? "Buyer Lead" : "Client"} • {property?.city || "No location"}
              </p>
              
              {/* Status - Inline */}
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[rgba(61,122,74,0.08)] text-[#3d7a4a] dark:bg-[rgba(74,222,128,0.1)] dark:text-[#4ade80]">
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions - Icon-only, horizontal */}
          <div className="flex items-center gap-2 mt-5">
            <Button variant="outline" size="sm" className="flex-1 h-9 text-[12px] gap-2">
              <Mail className="h-3.5 w-3.5" />
              Email
            </Button>
            <Button variant="outline" size="sm" className="flex-1 h-9 text-[12px] gap-2">
              <Phone className="h-3.5 w-3.5" />
              Call
            </Button>
            <Button variant="outline" size="sm" className="h-9 w-9 px-0">
              <Video className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Data Sections - Rhythm through spacing */}
        <div className="px-6 py-5 space-y-0 divide-y divide-[rgba(0,0,0,0.04)] dark:divide-[rgba(255,255,255,0.04)]">
          {/* Contact */}
          {lead.email && (
            <DetailField
              label="Email"
              value={
                <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                  {lead.email}
                </a>
              }
            />
          )}
          
          {lead.phone && (
            <DetailField
              label="Phone"
              value={
                <a href={`tel:${lead.phone}`} className="hover:underline">
                  {lead.phone}
                </a>
              }
            />
          )}
          
          {property && (
            <DetailField
              label="Location"
              value={property.city}
            />
          )}
        </div>

        {/* Financial Section */}
        <div className="px-6 py-5 border-t border-[rgba(0,0,0,0.04)] dark:border-[rgba(255,255,255,0.04)]">
          <p className="text-overline mb-4">Deal Information</p>
          
          {/* Budget - Highlighted */}
          <div className="p-4 rounded-xl bg-muted/30">
            <p className="text-overline">Budget Range</p>
            {dealValue ? (
              <p className="metric-value mt-1">
                ${(dealValue * 0.8).toLocaleString()} – ${(dealValue * 1.2).toLocaleString()}
              </p>
            ) : (
              <p className="text-[14px] text-muted-foreground mt-1">Not specified</p>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-[rgba(0,0,0,0.04)] dark:border-[rgba(255,255,255,0.04)]">
            <DetailField
              label="Created"
              value={new Date(lead.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              editable={false}
            />
          </div>
        </div>

        {/* Activity Section - Compact */}
        <div className="px-6 py-5 border-t border-[rgba(0,0,0,0.04)] dark:border-[rgba(255,255,255,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <p className="text-overline">Recent Activity</p>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1">
              View All
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <div className="h-7 w-7 rounded-full bg-[rgba(74,111,165,0.08)] flex items-center justify-center shrink-0 mt-0.5">
                <MessageSquare className="h-3 w-3 text-[#4a6fa5]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">Email sent</p>
                <p className="text-[11px] text-muted-foreground">2 hours ago</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="h-7 w-7 rounded-full bg-[rgba(61,122,74,0.08)] flex items-center justify-center shrink-0 mt-0.5">
                <Phone className="h-3 w-3 text-[#3d7a4a]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">Call completed</p>
                <p className="text-[11px] text-muted-foreground">Yesterday</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions - Grouped logically */}
      <div className="shrink-0 p-4 border-t border-[rgba(0,0,0,0.04)] dark:border-[rgba(255,255,255,0.04)] bg-card space-y-2">
        {/* Primary action */}
        <Button className="w-full h-10 text-[13px]">
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
        
        {/* Destructive - De-emphasized */}
        <Button 
          variant="ghost" 
          className="w-full h-9 text-[12px] text-muted-foreground hover:text-destructive hover:bg-destructive/5"
        >
          Archive Lead
        </Button>
      </div>
    </aside>
  );
}
