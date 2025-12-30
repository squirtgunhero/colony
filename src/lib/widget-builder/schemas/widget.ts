/**
 * Widget Schema Definitions
 * Zod schemas for widget specifications and validation
 */

import { z } from "zod";

// Supported widget types
export const WidgetTypeSchema = z.enum([
  "kpi_card",
  "leads_table",
  "pipeline_kanban",
]);
export type WidgetType = z.infer<typeof WidgetTypeSchema>;

// Supported regions in the dashboard
export const RegionSchema = z.enum(["left", "main", "right"]);
export type Region = z.infer<typeof RegionSchema>;

// Supported boroughs for filtering
export const BoroughSchema = z.enum([
  "Manhattan",
  "Brooklyn",
  "Queens",
  "Bronx",
  "Staten Island",
]);
export type Borough = z.infer<typeof BoroughSchema>;

// Date range filter type
export const DateRangeSchema = z.object({
  days: z.number().int().positive(),
  label: z.string(),
});
export type DateRange = z.infer<typeof DateRangeSchema>;

// Widget placement within the grid
export const PlacementSchema = z.object({
  page: z.string().default("home"),
  region: RegionSchema,
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1),
  h: z.number().int().min(1),
});
export type Placement = z.infer<typeof PlacementSchema>;

// KPI Card specific props
export const KpiCardPropsSchema = z.object({
  label: z.string(),
  metric: z.enum(["new_leads", "total_leads", "deals_value"]).default("new_leads"),
  dateRange: DateRangeSchema.optional(),
});
export type KpiCardProps = z.infer<typeof KpiCardPropsSchema>;

// Leads Table specific props
export const LeadsTablePropsSchema = z.object({
  title: z.string().default("Leads"),
  boroughFilter: BoroughSchema.optional(),
  dateRange: DateRangeSchema.optional(),
});
export type LeadsTableProps = z.infer<typeof LeadsTablePropsSchema>;

// Pipeline Kanban specific props
export const PipelineKanbanPropsSchema = z.object({
  title: z.string().default("Pipeline"),
  groupBy: z.enum(["stage"]).default("stage"),
  dateRange: DateRangeSchema.optional(),
});
export type PipelineKanbanProps = z.infer<typeof PipelineKanbanPropsSchema>;

// Union of all widget props
export const WidgetPropsSchema = z.union([
  KpiCardPropsSchema,
  LeadsTablePropsSchema,
  PipelineKanbanPropsSchema,
]);
export type WidgetProps = z.infer<typeof WidgetPropsSchema>;

// Full widget specification
export const WidgetSpecSchema = z.object({
  id: z.string(),
  widgetType: WidgetTypeSchema,
  placement: PlacementSchema,
  props: z.record(z.string(), z.unknown()), // Validated per widget type
  createdBy: z.enum(["text", "manual"]),
  createdAt: z.string(),
});
export type WidgetSpec = z.infer<typeof WidgetSpecSchema>;

// Helper to validate props based on widget type
export function validateWidgetProps(
  widgetType: WidgetType,
  props: Record<string, unknown>
): { success: true; data: WidgetProps } | { success: false; error: string } {
  try {
    let validatedProps: WidgetProps;
    
    switch (widgetType) {
      case "kpi_card":
        validatedProps = KpiCardPropsSchema.parse(props);
        break;
      case "leads_table":
        validatedProps = LeadsTablePropsSchema.parse(props);
        break;
      case "pipeline_kanban":
        validatedProps = PipelineKanbanPropsSchema.parse(props);
        break;
      default:
        return { success: false, error: `Unknown widget type: ${widgetType}` };
    }
    
    return { success: true, data: validatedProps };
  } catch (e) {
    const error = e instanceof z.ZodError 
      ? e.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
      : 'Unknown validation error';
    return { success: false, error };
  }
}

