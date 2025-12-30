/**
 * Widget Registry
 * Maps widget types to their components, schemas, and metadata
 */

import type { ComponentType } from "react";
import type { ZodSchema } from "zod";
import type { WidgetType } from "../schemas";
import { 
  KpiCardPropsSchema, 
  LeadsTablePropsSchema, 
  PipelineKanbanPropsSchema 
} from "../schemas";

// Widget component props base
export interface WidgetComponentProps {
  id: string;
  props: Record<string, unknown>;
}

// Registry entry structure
export interface WidgetRegistryEntry {
  displayName: string;
  description: string;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  propsSchema: ZodSchema;
  // Component is lazy-loaded to avoid circular dependencies
  component: ComponentType<WidgetComponentProps>;
}

// Placeholder components (will be replaced with actual implementations)
const PlaceholderComponent: ComponentType<WidgetComponentProps> = () => null;

// Widget registry definition
export const widgetRegistry: Record<WidgetType, WidgetRegistryEntry> = {
  kpi_card: {
    displayName: "KPI Card",
    description: "Display a key metric with optional date range filter",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    propsSchema: KpiCardPropsSchema,
    component: PlaceholderComponent,
  },
  leads_table: {
    displayName: "Leads Table",
    description: "Display a table of leads with filtering options",
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    propsSchema: LeadsTablePropsSchema,
    component: PlaceholderComponent,
  },
  pipeline_kanban: {
    displayName: "Pipeline Kanban",
    description: "Display deals in a kanban board grouped by stage",
    defaultSize: { w: 8, h: 5 },
    minSize: { w: 6, h: 4 },
    propsSchema: PipelineKanbanPropsSchema,
    component: PlaceholderComponent,
  },
};

/**
 * Get registry entry for a widget type
 */
export function getWidgetEntry(widgetType: WidgetType): WidgetRegistryEntry | undefined {
  return widgetRegistry[widgetType];
}

/**
 * Get all supported widget types
 */
export function getSupportedWidgetTypes(): WidgetType[] {
  return Object.keys(widgetRegistry) as WidgetType[];
}

/**
 * Check if a widget type is supported
 */
export function isWidgetTypeSupported(widgetType: string): widgetType is WidgetType {
  return widgetType in widgetRegistry;
}

