// ============================================================================
// COLONY LAM - Query Engine Executors
// Executes analytical queries against the database safely
// ============================================================================

import { prisma } from "@/lib/prisma";
import type { ActionExecutor } from "../types";
import {
  planQuery,
  validateQuerySpec,
  resolveDatePlaceholders,
  scopeToUser,
  type QueryPlan,
  type QuerySpec,
} from "../query-planner";

// ============================================================================
// Prisma Model Map (safe access via string key)
// ============================================================================

type PrismaDelegate = {
  count: (args: Record<string, unknown>) => Promise<number>;
  findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  aggregate: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
  groupBy: (args: Record<string, unknown>) => Promise<unknown[]>;
};

function getPrismaModel(model: string): PrismaDelegate | null {
  const map: Record<string, PrismaDelegate> = {
    contact: prisma.contact as unknown as PrismaDelegate,
    deal: prisma.deal as unknown as PrismaDelegate,
    task: prisma.task as unknown as PrismaDelegate,
    property: prisma.property as unknown as PrismaDelegate,
    activity: prisma.activity as unknown as PrismaDelegate,
    callRecording: prisma.callRecording as unknown as PrismaDelegate,
    emailInteraction: prisma.emailInteraction as unknown as PrismaDelegate,
  };
  return map[model] || null;
}

// ============================================================================
// Query Execution
// ============================================================================

async function executeQuerySpec(
  spec: QuerySpec,
  userId: string
): Promise<{ description: string; result: unknown }> {
  // Validate
  const error = validateQuerySpec(spec);
  if (error) {
    return { description: spec.description, result: { error } };
  }

  const delegate = getPrismaModel(spec.model);
  if (!delegate) {
    return { description: spec.description, result: { error: `Unknown model: ${spec.model}` } };
  }

  // Resolve placeholders in where clause
  let where = spec.where || {};
  where = scopeToUser(where, userId);
  where = resolveDatePlaceholders(where);

  try {
    switch (spec.operation) {
      case "count": {
        const count = await delegate.count({ where });
        return { description: spec.description, result: { count } };
      }

      case "findMany": {
        const args: Record<string, unknown> = { where };
        if (spec.orderBy) args.orderBy = spec.orderBy;
        if (spec.take) args.take = spec.take;
        if (spec.select) {
          const selectObj: Record<string, boolean> = {};
          for (const field of spec.select) selectObj[field] = true;
          args.select = selectObj;
        }
        if (spec.include) args.include = spec.include;
        const rows = await delegate.findMany(args);
        return { description: spec.description, result: { rows, total: rows.length } };
      }

      case "aggregate": {
        const args: Record<string, unknown> = { where };
        if (spec.aggregate) {
          if (spec.aggregate._sum) {
            const sumObj: Record<string, boolean> = {};
            for (const f of spec.aggregate._sum) sumObj[f] = true;
            args._sum = sumObj;
          }
          if (spec.aggregate._avg) {
            const avgObj: Record<string, boolean> = {};
            for (const f of spec.aggregate._avg) avgObj[f] = true;
            args._avg = avgObj;
          }
          if (spec.aggregate._min) {
            const minObj: Record<string, boolean> = {};
            for (const f of spec.aggregate._min) minObj[f] = true;
            args._min = minObj;
          }
          if (spec.aggregate._max) {
            const maxObj: Record<string, boolean> = {};
            for (const f of spec.aggregate._max) maxObj[f] = true;
            args._max = maxObj;
          }
          if (spec.aggregate._count) {
            args._count = spec.aggregate._count;
          }
        }
        const agg = await delegate.aggregate(args);
        return { description: spec.description, result: agg };
      }

      case "groupBy": {
        if (!spec.groupBy || spec.groupBy.length === 0) {
          return { description: spec.description, result: { error: "groupBy requires fields" } };
        }
        const args: Record<string, unknown> = {
          by: spec.groupBy,
          where,
          _count: { _all: true },
        };
        if (spec.aggregate?._sum) {
          const sumObj: Record<string, boolean> = {};
          for (const f of spec.aggregate._sum) sumObj[f] = true;
          args._sum = sumObj;
        }
        if (spec.aggregate?._avg) {
          const avgObj: Record<string, boolean> = {};
          for (const f of spec.aggregate._avg) avgObj[f] = true;
          args._avg = avgObj;
        }
        if (spec.orderBy) args.orderBy = spec.orderBy;
        const groups = await delegate.groupBy(args);
        return { description: spec.description, result: { groups } };
      }

      default:
        return { description: spec.description, result: { error: `Unknown operation: ${spec.operation}` } };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Query execution failed";
    return { description: spec.description, result: { error: message } };
  }
}

// ============================================================================
// Response Formatting
// ============================================================================

function formatQueryResults(
  plan: QueryPlan,
  results: Array<{ description: string; result: unknown }>
): Record<string, unknown> {
  return {
    format: plan.format,
    template: plan.natural_answer_template,
    queryResults: results.map((r, i) => ({
      query: i + 1,
      description: r.description,
      data: r.result,
    })),
  };
}

// ============================================================================
// Executors
// ============================================================================

export const queryExecutors: Record<string, ActionExecutor> = {
  "query.ask": async (action, ctx) => {
    const payload = action.payload as { question: string };

    try {
      // Step 1: Plan the query via LLM
      const plan = await planQuery(payload.question, ctx.user_id);

      // Step 2: Validate all specs
      for (const spec of plan.queries) {
        const err = validateQuerySpec(spec);
        if (err) {
          return {
            action_id: action.action_id,
            action_type: "query.ask",
            status: "failed",
            error: `Invalid query: ${err}`,
          };
        }
      }

      // Step 3: Execute all queries
      const results = await Promise.all(
        plan.queries.map(spec => executeQuerySpec(spec, ctx.user_id))
      );

      // Step 4: Format
      const formatted = formatQueryResults(plan, results);

      return {
        action_id: action.action_id,
        action_type: "query.ask",
        status: "success",
        data: formatted,
      };
    } catch (err) {
      return {
        action_id: action.action_id,
        action_type: "query.ask",
        status: "failed",
        error: err instanceof Error ? err.message : "Query planning failed",
      };
    }
  },

  "query.report": async (action, ctx) => {
    const payload = action.payload as {
      reportType: string;
      dateRange?: string;
    };

    // Pre-built report queries
    const reportQueries: Record<string, QueryPlan> = {
      pipeline: {
        queries: [
          {
            model: "deal",
            operation: "groupBy",
            where: { userId: "USER_ID" },
            groupBy: ["stage"],
            aggregate: { _sum: ["value"], _count: true },
            description: "Deal count and value by stage",
          },
          {
            model: "deal",
            operation: "aggregate",
            where: { userId: "USER_ID" },
            aggregate: { _sum: ["value"], _count: true },
            description: "Total pipeline value",
          },
        ],
        format: "table",
        natural_answer_template: "Here's your pipeline breakdown: {{results}}",
      },
      activity: {
        queries: [
          {
            model: "contact",
            operation: "count",
            where: { userId: "USER_ID", createdAt: { gte: "START_OF_MONTH" } },
            description: "New contacts this month",
          },
          {
            model: "deal",
            operation: "count",
            where: { userId: "USER_ID", createdAt: { gte: "START_OF_MONTH" } },
            description: "New deals this month",
          },
          {
            model: "task",
            operation: "count",
            where: { userId: "USER_ID", completed: true, updatedAt: { gte: "START_OF_MONTH" } },
            description: "Tasks completed this month",
          },
          {
            model: "deal",
            operation: "count",
            where: { userId: "USER_ID", stage: "closed", closedAt: { gte: "START_OF_MONTH" } },
            description: "Deals closed this month",
          },
        ],
        format: "summary",
        natural_answer_template: "This month: {{newContacts}} new contacts, {{newDeals}} new deals, {{tasksCompleted}} tasks completed, {{dealsClosed}} deals closed.",
      },
      contacts: {
        queries: [
          {
            model: "contact",
            operation: "groupBy",
            where: { userId: "USER_ID" },
            groupBy: ["type"],
            aggregate: { _count: true },
            description: "Contacts by type",
          },
          {
            model: "contact",
            operation: "groupBy",
            where: { userId: "USER_ID" },
            groupBy: ["source"],
            aggregate: { _count: true },
            description: "Contacts by source",
          },
        ],
        format: "table",
        natural_answer_template: "Here's your contact breakdown: {{results}}",
      },
    };

    const plan = reportQueries[payload.reportType];
    if (!plan) {
      return {
        action_id: action.action_id,
        action_type: "query.report",
        status: "failed",
        error: `Unknown report type: ${payload.reportType}. Available: ${Object.keys(reportQueries).join(", ")}`,
      };
    }

    try {
      const results = await Promise.all(
        plan.queries.map(spec => executeQuerySpec(spec, ctx.user_id))
      );

      return {
        action_id: action.action_id,
        action_type: "query.report",
        status: "success",
        data: formatQueryResults(plan, results),
      };
    } catch (err) {
      return {
        action_id: action.action_id,
        action_type: "query.report",
        status: "failed",
        error: err instanceof Error ? err.message : "Report generation failed",
      };
    }
  },

  "query.compare": async (action, ctx) => {
    const payload = action.payload as { question: string };

    try {
      const plan = await planQuery(payload.question, ctx.user_id);

      // Ensure comparison format
      if (plan.queries.length < 2) {
        return {
          action_id: action.action_id,
          action_type: "query.compare",
          status: "failed",
          error: "Comparison requires at least two data points. Try rephrasing with a specific comparison (e.g., 'this month vs last month').",
        };
      }

      for (const spec of plan.queries) {
        const err = validateQuerySpec(spec);
        if (err) {
          return {
            action_id: action.action_id,
            action_type: "query.compare",
            status: "failed",
            error: `Invalid query: ${err}`,
          };
        }
      }

      const results = await Promise.all(
        plan.queries.map(spec => executeQuerySpec(spec, ctx.user_id))
      );

      return {
        action_id: action.action_id,
        action_type: "query.compare",
        status: "success",
        data: {
          ...formatQueryResults(plan, results),
          format: "comparison",
        },
      };
    } catch (err) {
      return {
        action_id: action.action_id,
        action_type: "query.compare",
        status: "failed",
        error: err instanceof Error ? err.message : "Comparison failed",
      };
    }
  },
};
