// ============================================================================
// COLONY LAM - Natural Language Query Planner
// Converts analytical questions into safe, scoped Prisma query specs
// ============================================================================

import { z } from "zod";
import { getDefaultProvider, type LLMMessage } from "./llm";

// ============================================================================
// Allowed Models & Fields (whitelist for safety)
// ============================================================================

const ALLOWED_MODELS: Record<string, { fields: string[]; dateFields: string[]; numericFields: string[]; label: string }> = {
  contact: {
    label: "Contact",
    fields: ["id", "name", "email", "phone", "type", "tags", "source", "isFavorite", "createdAt", "updatedAt", "relationshipScore", "lastContactedAt", "campaignChannel", "campaignName"],
    dateFields: ["createdAt", "updatedAt", "lastContactedAt", "lastVerifiedAt"],
    numericFields: ["relationshipScore"],
  },
  deal: {
    label: "Deal",
    fields: ["id", "title", "stage", "value", "probability", "weightedValue", "expectedCloseDate", "closedAt", "lostReason", "notes", "isFavorite", "createdAt", "updatedAt", "transactionSide", "commissionPercent", "commissionAmount"],
    dateFields: ["createdAt", "updatedAt", "expectedCloseDate", "closedAt", "contractDate", "closingDate"],
    numericFields: ["value", "probability", "weightedValue", "commissionPercent", "commissionAmount", "earnestMoney", "loanAmount"],
  },
  task: {
    label: "Task",
    fields: ["id", "title", "description", "dueDate", "priority", "completed", "createdAt", "updatedAt"],
    dateFields: ["createdAt", "updatedAt", "dueDate"],
    numericFields: [],
  },
  property: {
    label: "Property",
    fields: ["id", "address", "city", "state", "zip", "price", "beds", "baths", "sqft", "status", "type", "createdAt", "updatedAt"],
    dateFields: ["createdAt", "updatedAt"],
    numericFields: ["price", "beds", "baths", "sqft"],
  },
  activity: {
    label: "Activity",
    fields: ["id", "type", "description", "contactId", "dealId", "createdAt"],
    dateFields: ["createdAt"],
    numericFields: [],
  },
  callRecording: {
    label: "CallRecording",
    fields: ["id", "contactId", "direction", "status", "duration", "sentiment", "occurredAt"],
    dateFields: ["occurredAt", "createdAt"],
    numericFields: ["duration"],
  },
  emailInteraction: {
    label: "EmailInteraction",
    fields: ["id", "contactId", "direction", "subject", "sentAt"],
    dateFields: ["sentAt"],
    numericFields: [],
  },
};

// ============================================================================
// Query Spec Schema (what the LLM produces)
// ============================================================================

export const QuerySpecSchema = z.object({
  model: z.string(),
  operation: z.enum(["count", "findMany", "aggregate", "groupBy"]),
  where: z.record(z.string(), z.unknown()).optional(),
  orderBy: z.record(z.string(), z.enum(["asc", "desc"])).optional(),
  take: z.number().int().min(1).max(100).optional(),
  select: z.array(z.string()).optional(),
  include: z.record(z.string(), z.unknown()).optional(),
  aggregate: z.object({
    _sum: z.array(z.string()).optional(),
    _avg: z.array(z.string()).optional(),
    _min: z.array(z.string()).optional(),
    _max: z.array(z.string()).optional(),
    _count: z.union([z.literal(true), z.array(z.string())]).optional(),
  }).optional(),
  groupBy: z.array(z.string()).optional(),
  description: z.string(),
});

export type QuerySpec = z.infer<typeof QuerySpecSchema>;

// ============================================================================
// Query Plan (may contain multiple queries for comparisons)
// ============================================================================

export const QueryPlanSchema = z.object({
  queries: z.array(QuerySpecSchema).min(1).max(5),
  format: z.enum(["number", "list", "table", "comparison", "summary"]),
  natural_answer_template: z.string(),
});

export type QueryPlan = z.infer<typeof QueryPlanSchema>;

// ============================================================================
// Query Detection
// ============================================================================

const QUERY_PATTERNS = [
  /how many/i,
  /what('s| is| are) (my|the|our) (total|average|top|best|worst|highest|lowest)/i,
  /who (are|is|has|have) (my|the|our)/i,
  /show me (the )?(stats|metrics|numbers|data|analytics)/i,
  /what('s| is) (my|the) (pipeline|revenue|conversion|close rate)/i,
  /compare/i,
  /breakdown/i,
  /which (contacts?|deals?|tasks?|properties?) (have|are|were|did)/i,
  /total (value|revenue|deals|contacts|tasks)/i,
  /average (deal|value|score|duration)/i,
  /count (of |my )/i,
  /top \d+/i,
  /bottom \d+/i,
  /deals? (closed|won|lost|created)/i,
  /leads? (added|created|converted)/i,
  /pipeline (value|summary|report)/i,
  /this (month|week|quarter|year)/i,
  /last (month|week|quarter|year)/i,
  /between .+ and .+/i,
  /since (january|february|march|april|may|june|july|august|september|october|november|december|\d)/i,
];

/**
 * Detect if a message is an analytical query that should go through the query engine
 * rather than the standard LAM planner.
 */
export function isAnalyticalQuery(message: string): boolean {
  const lower = message.toLowerCase();

  // Exclude action-oriented messages
  if (/\b(create|add|update|delete|remove|send|email|call|set up|enroll|pause|resume|launch)\b/i.test(lower)) {
    return false;
  }

  return QUERY_PATTERNS.some(p => p.test(lower));
}

// ============================================================================
// LLM-Powered Query Planning
// ============================================================================

const QUERY_PLANNER_PROMPT = `You convert natural language CRM questions into Prisma query specifications. You are precise and always scope queries to the user's data.

## Available Models and Fields
${Object.entries(ALLOWED_MODELS).map(([model, info]) =>
  `- **${info.label}** (model: "${model}"): ${info.fields.join(", ")}
    Date fields: ${info.dateFields.join(", ") || "none"}
    Numeric fields: ${info.numericFields.join(", ") || "none"}`
).join("\n")}

## Important Rules
1. ALWAYS include a userId filter in the where clause — use "USER_ID" as placeholder (system replaces it).
2. For team-scoped models (contact, deal, task, property), use userId or teamId filter.
3. Date ranges: Use Prisma date filter syntax: { gte: "ISO_DATE", lte: "ISO_DATE" }
4. For "this month", "last week", etc. — use TODAY_START_OF_MONTH, TODAY_START_OF_WEEK, etc. as placeholders.
5. Only use fields from the allowed list above.
6. For count: use operation "count" with where filters.
7. For "top N by X": use findMany with orderBy and take.
8. For totals/averages: use aggregate with _sum, _avg, _min, _max.
9. For breakdowns: use groupBy with the field to group by.
10. For comparisons (e.g., "this month vs last month"), return multiple queries.
11. Maximum 5 queries per plan.
12. The natural_answer_template should be a template string with {{placeholders}} for where query results will be inserted.

## Date Placeholders (system replaces these with actual ISO dates)
- TODAY: current date at midnight
- TODAY_END: current date end of day
- START_OF_WEEK: Monday of current week
- START_OF_MONTH: first day of current month
- START_OF_QUARTER: first day of current quarter
- START_OF_YEAR: first day of current year
- START_OF_LAST_MONTH: first day of previous month
- END_OF_LAST_MONTH: last day of previous month
- START_OF_LAST_WEEK: Monday of previous week
- END_OF_LAST_WEEK: Sunday of previous week
- DAYS_AGO_7: 7 days ago
- DAYS_AGO_30: 30 days ago
- DAYS_AGO_90: 90 days ago

## Output Format
Return a JSON object with:
- queries: array of query specs (each with model, operation, where, orderBy, take, select, aggregate, groupBy, description)
- format: "number" | "list" | "table" | "comparison" | "summary"
- natural_answer_template: template string for the response

Respond with valid JSON only. No markdown.`;

/**
 * Generate a query plan from a natural language question.
 */
export async function planQuery(
  question: string,
  userId: string
): Promise<QueryPlan> {
  const llm = getDefaultProvider();

  const messages: LLMMessage[] = [
    { role: "system", content: QUERY_PLANNER_PROMPT },
    { role: "user", content: `Question: "${question}"\nUser ID: USER_ID\nToday's date: ${new Date().toISOString().split("T")[0]}` },
  ];

  const { data } = await llm.completeJSON(messages, QueryPlanSchema, {
    temperature: 0.1,
    maxTokens: 2048,
  });

  return data;
}

// ============================================================================
// Safety Validation
// ============================================================================

/**
 * Validate a query spec against the allowed models and fields whitelist.
 * Returns null if valid, or an error string if invalid.
 */
export function validateQuerySpec(spec: QuerySpec): string | null {
  // Check model is allowed
  const modelInfo = ALLOWED_MODELS[spec.model];
  if (!modelInfo) {
    return `Model "${spec.model}" is not allowed. Allowed: ${Object.keys(ALLOWED_MODELS).join(", ")}`;
  }

  // Check select fields are allowed
  if (spec.select) {
    for (const field of spec.select) {
      if (!modelInfo.fields.includes(field)) {
        return `Field "${field}" is not allowed on model "${spec.model}"`;
      }
    }
  }

  // Check orderBy fields are allowed
  if (spec.orderBy) {
    for (const field of Object.keys(spec.orderBy)) {
      if (!modelInfo.fields.includes(field)) {
        return `Cannot order by "${field}" on model "${spec.model}"`;
      }
    }
  }

  // Check groupBy fields are allowed
  if (spec.groupBy) {
    for (const field of spec.groupBy) {
      if (!modelInfo.fields.includes(field)) {
        return `Cannot group by "${field}" on model "${spec.model}"`;
      }
    }
  }

  // Check aggregate fields are numeric
  if (spec.aggregate) {
    const aggFields = [
      ...(spec.aggregate._sum || []),
      ...(spec.aggregate._avg || []),
      ...(spec.aggregate._min || []),
      ...(spec.aggregate._max || []),
    ];
    for (const field of aggFields) {
      if (!modelInfo.numericFields.includes(field) && !modelInfo.dateFields.includes(field)) {
        return `Cannot aggregate non-numeric field "${field}" on model "${spec.model}"`;
      }
    }
  }

  // Ensure userId scoping is present in where
  if (spec.where) {
    const whereStr = JSON.stringify(spec.where);
    if (!whereStr.includes("USER_ID") && !whereStr.includes("userId")) {
      return "Query must be scoped to user (missing userId in where clause)";
    }
  } else {
    return "Query must have a where clause with userId";
  }

  return null;
}

// ============================================================================
// Date Placeholder Resolution
// ============================================================================

export function resolveDatePlaceholders(where: Record<string, unknown>): Record<string, unknown> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // Monday

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfQuarter = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
  const endOfLastWeek = new Date(startOfWeek);
  endOfLastWeek.setTime(endOfLastWeek.getTime() - 1);

  const placeholders: Record<string, string> = {
    TODAY: today.toISOString(),
    TODAY_END: todayEnd.toISOString(),
    START_OF_WEEK: startOfWeek.toISOString(),
    START_OF_MONTH: startOfMonth.toISOString(),
    START_OF_QUARTER: startOfQuarter.toISOString(),
    START_OF_YEAR: startOfYear.toISOString(),
    START_OF_LAST_MONTH: startOfLastMonth.toISOString(),
    END_OF_LAST_MONTH: endOfLastMonth.toISOString(),
    START_OF_LAST_WEEK: startOfLastWeek.toISOString(),
    END_OF_LAST_WEEK: endOfLastWeek.toISOString(),
    DAYS_AGO_7: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    DAYS_AGO_30: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    DAYS_AGO_90: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  };

  return JSON.parse(
    JSON.stringify(where).replace(
      /(")(TODAY|TODAY_END|START_OF_WEEK|START_OF_MONTH|START_OF_QUARTER|START_OF_YEAR|START_OF_LAST_MONTH|END_OF_LAST_MONTH|START_OF_LAST_WEEK|END_OF_LAST_WEEK|DAYS_AGO_7|DAYS_AGO_30|DAYS_AGO_90)(")/g,
      (_match, _q1, placeholder, _q3) => `"${placeholders[placeholder] || placeholder}"`
    )
  );
}

/**
 * Replace USER_ID placeholder with actual user ID in where clause.
 */
export function scopeToUser(where: Record<string, unknown>, userId: string): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(where).replace(/USER_ID/g, userId)
  );
}
