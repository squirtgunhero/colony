"use client";

import { useState } from "react";
import { 
  Download, 
  Users, 
  Building2, 
  Target, 
  CheckSquare, 
  Activity,
  Calendar,
  FileSpreadsheet,
  Loader2,
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  exportContactsCSV, 
  exportPropertiesCSV, 
  exportDealsCSV, 
  exportTasksCSV,
  exportActivitiesCSV,
  type ExportStats,
  type ExportOptions 
} from "@/app/(dashboard)/export/actions";

interface ExportCenterProps {
  stats: ExportStats;
}

type ExportType = "contacts" | "properties" | "deals" | "tasks" | "activities";

const exportConfig: Record<ExportType, {
  label: string;
  icon: typeof Users;
  color: string;
  bgColor: string;
  action: (options?: ExportOptions) => Promise<string>;
}> = {
  contacts: {
    label: "Contacts",
    icon: Users,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    action: exportContactsCSV,
  },
  properties: {
    label: "Properties",
    icon: Building2,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    action: exportPropertiesCSV,
  },
  deals: {
    label: "Deals",
    icon: Target,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    action: exportDealsCSV,
  },
  tasks: {
    label: "Tasks",
    icon: CheckSquare,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    action: exportTasksCSV,
  },
  activities: {
    label: "Activities",
    icon: Activity,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    action: exportActivitiesCSV,
  },
};

export function ExportCenter({ stats }: ExportCenterProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exporting, setExporting] = useState<ExportType | "all" | null>(null);

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async (type: ExportType) => {
    setExporting(type);
    try {
      const options: ExportOptions = {};
      if (startDate) options.startDate = startDate;
      if (endDate) options.endDate = endDate;
      
      const csv = await exportConfig[type].action(options);
      downloadCSV(csv, type);
    } catch (error) {
      console.error(`Export ${type} failed:`, error);
    } finally {
      setExporting(null);
    }
  };

  const handleExportAll = async () => {
    setExporting("all");
    try {
      const options: ExportOptions = {};
      if (startDate) options.startDate = startDate;
      if (endDate) options.endDate = endDate;

      // Export all data types
      const types: ExportType[] = ["contacts", "properties", "deals", "tasks", "activities"];
      for (const type of types) {
        const csv = await exportConfig[type].action(options);
        downloadCSV(csv, type);
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.error("Export all failed:", error);
    } finally {
      setExporting(null);
    }
  };

  const totalRecords = stats.contacts + stats.properties + stats.deals + stats.tasks + stats.activities;

  return (
    <div className="space-y-8">
      {/* Date Filter */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Date Range Filter</h2>
            <p className="text-sm text-muted-foreground">Optional: Filter exports by creation date</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {(startDate || endDate) && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-3"
            onClick={() => { setStartDate(""); setEndDate(""); }}
          >
            Clear dates
          </Button>
        )}
      </Card>

      {/* Export All */}
      <Card className="p-6 border-primary/20 bg-primary/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Export All Data</h2>
              <p className="text-sm text-muted-foreground">
                Download all {totalRecords.toLocaleString()} records across 5 categories
              </p>
            </div>
          </div>
          <Button 
            size="lg"
            onClick={handleExportAll}
            disabled={exporting !== null}
            className="shrink-0"
          >
            {exporting === "all" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export All (5 files)
          </Button>
        </div>
      </Card>

      {/* Individual Exports */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Export by Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(Object.keys(exportConfig) as ExportType[]).map((type) => {
            const config = exportConfig[type];
            const Icon = config.icon;
            const count = stats[type];

            return (
              <Card key={type} className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${config.bgColor}`}>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div>
                      <h3 className="font-medium">{config.label}</h3>
                      <p className="text-sm text-muted-foreground">
                        {count.toLocaleString()} record{count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => handleExport(type)}
                  disabled={exporting !== null || count === 0}
                >
                  {exporting === type ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                  )}
                  Download CSV
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Info */}
      <Card className="p-4 bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <strong>Tip:</strong> CSV files can be opened in Excel, Google Sheets, or any spreadsheet application. 
          All exports include timestamps and related record names for easy reference.
        </p>
      </Card>
    </div>
  );
}

