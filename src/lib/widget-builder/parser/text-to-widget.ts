/**
 * Natural Language Command Parser
 * Deterministic keyword-based parsing for widget creation commands
 * No LLM calls - pure rule-based extraction
 */

import { v4 as uuidv4 } from "crypto";
import type { 
  WidgetSpec, 
  WidgetType, 
  Region,
  Borough,
  DateRange,
  KpiCardProps,
  LeadsTableProps,
  PipelineKanbanProps,
} from "../schemas";
import { widgetRegistry } from "../registry";

// Parser result types
export interface ParseSuccess {
  ok: true;
  widgetSpec: WidgetSpec;
}

export interface ParseError {
  ok: false;
  error: string;
  needsClarification?: boolean;
  suggestions?: string[];
}

export type ParseResult = ParseSuccess | ParseError;

// Keyword patterns for widget types
const WIDGET_PATTERNS: Record<WidgetType, RegExp[]> = {
  kpi_card: [
    /\bkpi\s*card\b/i,
    /\bkpi\b/i,
    /\bmetric\s*card\b/i,
    /\bstat\s*card\b/i,
    /\bcounter\b/i,
    /\bshowing\s+(?:new\s+)?leads\b/i,
    /\bnumber\s+of\b/i,
    /\bcount\s+of\b/i,
  ],
  leads_table: [
    /\bleads?\s*table\b/i,
    /\btable\s*(?:of|with|for)?\s*leads?\b/i,
    /\blead\s*list\b/i,
    /\blist\s*(?:of\s+)?leads?\b/i,
  ],
  pipeline_kanban: [
    /\bpipeline\s*kanban\b/i,
    /\bkanban\b/i,
    /\bpipeline\s*board\b/i,
    /\bdeals?\s*board\b/i,
    /\bstage\s*board\b/i,
    /\bpipeline\b/i,
  ],
};

// Keyword patterns for regions
const REGION_PATTERNS: Record<Region, RegExp[]> = {
  left: [
    /\bon\s*(?:the\s+)?left\b/i,
    /\bleft\s*(?:side|panel|column|area|region)\b/i,
    /\bin\s*(?:the\s+)?left\b/i,
  ],
  main: [
    /\bin\s*(?:the\s+)?main\b/i,
    /\bmain\s*(?:area|panel|column|region)\b/i,
    /\bcenter\b/i,
    /\bcentral\b/i,
    /\bmiddle\b/i,
  ],
  right: [
    /\bon\s*(?:the\s+)?right\b/i,
    /\bright\s*(?:side|panel|column|area|region)\b/i,
    /\bin\s*(?:the\s+)?right\b/i,
  ],
};

// Borough patterns
const BOROUGH_PATTERNS: Record<Borough, RegExp[]> = {
  Manhattan: [/\bmanhattan\b/i, /\bnyc\s*manhattan\b/i],
  Brooklyn: [/\bbrooklyn\b/i, /\bbk\b/i],
  Queens: [/\bqueens\b/i],
  Bronx: [/\bbronx\b/i, /\bthe\s*bronx\b/i],
  "Staten Island": [/\bstaten\s*island\b/i, /\bsi\b/i],
};

// Date range patterns
const DATE_RANGE_PATTERNS: Array<{ pattern: RegExp; days: number; label: string }> = [
  { pattern: /\blast\s*7\s*days?\b/i, days: 7, label: "Last 7 days" },
  { pattern: /\bpast\s*week\b/i, days: 7, label: "Past week" },
  { pattern: /\bthis\s*week\b/i, days: 7, label: "This week" },
  { pattern: /\blast\s*14\s*days?\b/i, days: 14, label: "Last 14 days" },
  { pattern: /\blast\s*2\s*weeks?\b/i, days: 14, label: "Last 2 weeks" },
  { pattern: /\blast\s*30\s*days?\b/i, days: 30, label: "Last 30 days" },
  { pattern: /\bpast\s*month\b/i, days: 30, label: "Past month" },
  { pattern: /\bthis\s*month\b/i, days: 30, label: "This month" },
  { pattern: /\blast\s*month\b/i, days: 30, label: "Last month" },
  { pattern: /\blast\s*90\s*days?\b/i, days: 90, label: "Last 90 days" },
  { pattern: /\blast\s*quarter\b/i, days: 90, label: "Last quarter" },
];

// Grouping patterns for kanban
const GROUP_BY_STAGE_PATTERN = /\bgrouped?\s*by\s*stage\b/i;

/**
 * Extract widget type from text
 */
function extractWidgetType(text: string): WidgetType | null {
  for (const [widgetType, patterns] of Object.entries(WIDGET_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return widgetType as WidgetType;
      }
    }
  }
  return null;
}

/**
 * Extract region from text
 */
function extractRegion(text: string): Region | null {
  for (const [region, patterns] of Object.entries(REGION_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return region as Region;
      }
    }
  }
  return null;
}

/**
 * Extract borough filter from text
 */
function extractBorough(text: string): Borough | null {
  for (const [borough, patterns] of Object.entries(BOROUGH_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return borough as Borough;
      }
    }
  }
  return null;
}

/**
 * Extract date range from text
 */
function extractDateRange(text: string): DateRange | null {
  for (const { pattern, days, label } of DATE_RANGE_PATTERNS) {
    if (pattern.test(text)) {
      return { days, label };
    }
  }
  return null;
}

/**
 * Check if grouping by stage is requested
 */
function extractGroupByStage(text: string): boolean {
  return GROUP_BY_STAGE_PATTERN.test(text);
}

/**
 * Generate a UUID using crypto
 */
function generateId(): string {
  // Use crypto.randomUUID() if available, otherwise generate manually
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Build KPI card props from parsed text
 */
function buildKpiCardProps(text: string, dateRange: DateRange | null): KpiCardProps {
  // Determine metric type from text
  let metric: "new_leads" | "total_leads" | "deals_value" = "new_leads";
  let label = "New Leads";
  
  if (/\btotal\s*leads?\b/i.test(text)) {
    metric = "total_leads";
    label = "Total Leads";
  } else if (/\bdeals?\s*value\b/i.test(text) || /\bpipeline\s*value\b/i.test(text)) {
    metric = "deals_value";
    label = "Deals Value";
  } else if (/\bnew\s*leads?\b/i.test(text)) {
    metric = "new_leads";
    label = "New Leads";
  }
  
  // Add date range to label if present
  if (dateRange) {
    label = `${label} (${dateRange.label})`;
  }
  
  return {
    label,
    metric,
    ...(dateRange ? { dateRange } : {}),
  };
}

/**
 * Build leads table props from parsed text
 */
function buildLeadsTableProps(
  text: string, 
  borough: Borough | null, 
  dateRange: DateRange | null
): LeadsTableProps {
  let title = "Leads";
  
  if (borough) {
    title = `${borough} Leads`;
  }
  
  if (dateRange) {
    title = `${title} (${dateRange.label})`;
  }
  
  return {
    title,
    ...(borough ? { boroughFilter: borough } : {}),
    ...(dateRange ? { dateRange } : {}),
  };
}

/**
 * Build pipeline kanban props from parsed text
 */
function buildPipelineKanbanProps(
  text: string,
  dateRange: DateRange | null
): PipelineKanbanProps {
  let title = "Pipeline";
  
  if (dateRange) {
    title = `${title} (${dateRange.label})`;
  }
  
  return {
    title,
    groupBy: "stage",
    ...(dateRange ? { dateRange } : {}),
  };
}

/**
 * Main parser function - converts natural language to WidgetSpec
 */
export function parseWidgetCommand(text: string): ParseResult {
  // Normalize input
  const normalizedText = text.trim().toLowerCase();
  
  if (!normalizedText) {
    return {
      ok: false,
      error: "Empty command. Please describe what widget you want to create.",
      needsClarification: true,
      suggestions: [
        "Add a KPI card showing new leads last 7 days",
        "Create a leads table filtered to Manhattan",
        "Add a pipeline kanban on the right",
      ],
    };
  }
  
  // Extract widget type
  const widgetType = extractWidgetType(text);
  
  if (!widgetType) {
    return {
      ok: false,
      error: "Could not determine widget type. Try specifying 'KPI card', 'leads table', or 'pipeline kanban'.",
      needsClarification: true,
      suggestions: [
        "Add a KPI card on the left showing new leads",
        "Create a leads table in the main area",
        "Add a pipeline kanban on the right grouped by stage",
      ],
    };
  }
  
  // Extract region (default to 'main' if not specified)
  const region = extractRegion(text) || "main";
  
  // Extract filters
  const borough = extractBorough(text);
  const dateRange = extractDateRange(text);
  
  // Get default size from registry
  const registryEntry = widgetRegistry[widgetType];
  const defaultSize = registryEntry?.defaultSize || { w: 4, h: 4 };
  
  // Build props based on widget type
  let props: Record<string, unknown>;
  
  switch (widgetType) {
    case "kpi_card":
      props = buildKpiCardProps(text, dateRange);
      break;
    case "leads_table":
      props = buildLeadsTableProps(text, borough, dateRange);
      break;
    case "pipeline_kanban":
      props = buildPipelineKanbanProps(text, dateRange);
      break;
    default:
      return {
        ok: false,
        error: `Unknown widget type: ${widgetType}`,
      };
  }
  
  // Create widget spec
  const widgetSpec: WidgetSpec = {
    id: generateId(),
    widgetType,
    placement: {
      page: "home",
      region,
      x: 0, // Will be calculated when adding to layout
      y: Infinity, // Stack at bottom of region
      w: defaultSize.w,
      h: defaultSize.h,
    },
    props,
    createdBy: "text",
    createdAt: new Date().toISOString(),
  };
  
  return {
    ok: true,
    widgetSpec,
  };
}

/**
 * Validate that parsed widget spec is complete
 */
export function validateParsedWidget(spec: WidgetSpec): ParseResult {
  // Basic validation is already done by Zod, but we can add semantic checks here
  
  if (!spec.id) {
    return {
      ok: false,
      error: "Widget ID is missing",
    };
  }
  
  if (!spec.widgetType) {
    return {
      ok: false,
      error: "Widget type is required",
      needsClarification: true,
      suggestions: ["kpi_card", "leads_table", "pipeline_kanban"],
    };
  }
  
  if (!spec.placement?.region) {
    return {
      ok: false,
      error: "Widget region is required",
      needsClarification: true,
      suggestions: ["left", "main", "right"],
    };
  }
  
  return {
    ok: true,
    widgetSpec: spec,
  };
}

