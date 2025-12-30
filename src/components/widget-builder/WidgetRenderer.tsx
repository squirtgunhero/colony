"use client";

/**
 * Widget Renderer
 * Dynamically renders widget components based on widget type
 */

import { useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "./widgets/KpiCard";
import { LeadsTable } from "./widgets/LeadsTable";
import { PipelineKanban } from "./widgets/PipelineKanban";
import type { WidgetSpec, WidgetType, KpiCardProps, LeadsTableProps, PipelineKanbanProps } from "@/lib/widget-builder";

interface WidgetRendererProps {
  widget: WidgetSpec;
}

// Component map for widget types
const widgetComponents: Record<
  WidgetType, 
  React.ComponentType<{ id: string; props: Record<string, unknown> }>
> = {
  kpi_card: KpiCard as React.ComponentType<{ id: string; props: Record<string, unknown> }>,
  leads_table: LeadsTable as React.ComponentType<{ id: string; props: Record<string, unknown> }>,
  pipeline_kanban: PipelineKanban as React.ComponentType<{ id: string; props: Record<string, unknown> }>,
};

/**
 * Error fallback for unknown widget types
 */
function UnknownWidget({ widgetType }: { widgetType: string }) {
  return (
    <Card className="h-full flex items-center justify-center bg-destructive/5 border-destructive/20">
      <CardContent className="flex flex-col items-center gap-2 text-center p-6">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-medium text-destructive">Unknown Widget</p>
        <p className="text-xs text-muted-foreground">
          Widget type &quot;{widgetType}&quot; is not supported.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Renders a widget based on its specification
 */
export function WidgetRenderer({ widget }: WidgetRendererProps) {
  const { id, widgetType, props } = widget;
  
  const Component = useMemo(() => {
    return widgetComponents[widgetType];
  }, [widgetType]);
  
  if (!Component) {
    return <UnknownWidget widgetType={widgetType} />;
  }
  
  return <Component id={id} props={props} />;
}

