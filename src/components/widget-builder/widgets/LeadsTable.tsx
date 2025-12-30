"use client";

/**
 * Leads Table Widget
 * Displays a filterable table of leads
 */

import { useMemo } from "react";
import { format } from "date-fns";
import { User, MapPin, Calendar, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { dataProvider } from "@/lib/widget-builder";
import type { LeadsTableProps, LeadStatus } from "@/lib/widget-builder";
import { cn } from "@/lib/utils";

interface LeadsTableWidgetProps {
  id: string;
  props: LeadsTableProps;
}

// Status badge styling
const statusStyles: Record<LeadStatus, { className: string; label: string }> = {
  new: { 
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", 
    label: "New" 
  },
  contacted: { 
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", 
    label: "Contacted" 
  },
  qualified: { 
    className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20", 
    label: "Qualified" 
  },
  unqualified: { 
    className: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20", 
    label: "Unqualified" 
  },
};

export function LeadsTable({ props }: LeadsTableWidgetProps) {
  const { title, boroughFilter, dateRange } = props;
  
  // Get filtered leads
  const leads = useMemo(() => {
    return dataProvider.getLeads({
      borough: boroughFilter,
      dateRange: dateRange ? { days: dateRange.days } : undefined,
    });
  }, [boroughFilter, dateRange]);
  
  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <span className="text-xs text-muted-foreground">
            {leads.length} lead{leads.length !== 1 ? "s" : ""}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[180px]">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Name
                  </div>
                </TableHead>
                <TableHead className="w-[120px]">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    Borough
                  </div>
                </TableHead>
                <TableHead className="w-[100px]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Created
                  </div>
                </TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.length === 0 ? (
                <TableRow>
                  <TableCell 
                    colSpan={4} 
                    className="h-24 text-center text-muted-foreground"
                  >
                    No leads found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => {
                  const status = statusStyles[lead.status];
                  return (
                    <TableRow key={lead.id} className="group">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                            {lead.name.split(" ").map(n => n[0]).join("")}
                          </div>
                          <span className="truncate">{lead.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.borough}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(lead.createdAt, "MMM d")}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", status.className)}
                        >
                          <Circle className="h-1.5 w-1.5 mr-1 fill-current" />
                          {status.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

