// Workflow Automation Executors
import { prisma } from "@/lib/prisma";
import type { ActionExecutor } from "../types";

// Ensure workflow runtime is initialized when executors load
import "@/lib/workflows/runtime";

export const workflowExecutors: Record<string, ActionExecutor> = {
  "workflow.create": async (action, ctx) => {
    const payload = action.payload as {
      name: string;
      description?: string;
      trigger: { type: string; entityType?: string; conditions?: Record<string, unknown> };
      steps: Array<{
        id: string;
        type: string;
        actionType?: string;
        params?: Record<string, unknown>;
        field?: string;
        operator?: string;
        value?: unknown;
        thenStep?: string;
        elseStep?: string;
        delayMinutes?: number;
        attributeSlug?: string;
      }>;
      status?: string;
    };

    const workflow = await prisma.workflow.create({
      data: {
        userId: ctx.user_id,
        name: payload.name,
        description: payload.description,
        trigger: JSON.parse(JSON.stringify(payload.trigger)),
        steps: JSON.parse(JSON.stringify(payload.steps)),
        status: payload.status || "active",
      },
    });

    // Build a human-readable summary
    const triggerDesc = describeTrigger(payload.trigger);
    const stepsDesc = payload.steps
      .map((s, i) => `  ${i + 1}. ${describeStep(s)}`)
      .join("\n");

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: {
        workflowId: workflow.id,
        name: workflow.name,
        status: workflow.status,
        summary: `**${workflow.name}**\n\nTrigger: ${triggerDesc}\n\nSteps:\n${stepsDesc}`,
        message: `Workflow "${workflow.name}" created and ${workflow.status === "active" ? "active" : "saved as draft"}.`,
      },
    };
  },

  "workflow.list": async (action, ctx) => {
    const payload = action.payload as { status?: string };

    const workflows = await prisma.workflow.findMany({
      where: {
        userId: ctx.user_id,
        ...(payload.status ? { status: payload.status } : {}),
      },
      include: {
        _count: { select: { runs: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: {
        workflows: workflows.map((w) => ({
          id: w.id,
          name: w.name,
          description: w.description,
          status: w.status,
          trigger: w.trigger,
          stepCount: (w.steps as unknown[]).length,
          runCount: w.runCount,
          lastRunAt: w.lastRunAt,
          totalRuns: w._count.runs,
        })),
        total: workflows.length,
        message: workflows.length === 0
          ? "No workflows set up yet. You can create one by describing what should happen when an event occurs."
          : `Found ${workflows.length} workflow(s).`,
      },
    };
  },

  "workflow.pause": async (action, ctx) => {
    const payload = action.payload as { id?: string; name?: string };
    const workflow = await findWorkflow(ctx.user_id, payload);

    if (!workflow) {
      return { action_id: action.action_id, action_type: action.type, status: "failed", error: "Workflow not found" };
    }

    await prisma.workflow.update({
      where: { id: workflow.id },
      data: { status: "paused" },
    });

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: { name: workflow.name, message: `Workflow "${workflow.name}" paused.` },
    };
  },

  "workflow.resume": async (action, ctx) => {
    const payload = action.payload as { id?: string; name?: string };
    const workflow = await findWorkflow(ctx.user_id, payload);

    if (!workflow) {
      return { action_id: action.action_id, action_type: action.type, status: "failed", error: "Workflow not found" };
    }

    await prisma.workflow.update({
      where: { id: workflow.id },
      data: { status: "active" },
    });

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: { name: workflow.name, message: `Workflow "${workflow.name}" resumed.` },
    };
  },

  "workflow.delete": async (action, ctx) => {
    const payload = action.payload as { id?: string; name?: string };
    const workflow = await findWorkflow(ctx.user_id, payload);

    if (!workflow) {
      return { action_id: action.action_id, action_type: action.type, status: "failed", error: "Workflow not found" };
    }

    await prisma.workflow.delete({ where: { id: workflow.id } });

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: { name: workflow.name, message: `Workflow "${workflow.name}" deleted.` },
    };
  },

  "workflow.getStatus": async (action, ctx) => {
    const payload = action.payload as { id?: string; name?: string };
    const workflow = await findWorkflow(ctx.user_id, payload);

    if (!workflow) {
      return { action_id: action.action_id, action_type: action.type, status: "failed", error: "Workflow not found" };
    }

    // Get recent runs with stats
    const [runs, successCount, failedCount] = await Promise.all([
      prisma.workflowRun.findMany({
        where: { workflowId: workflow.id },
        orderBy: { startedAt: "desc" },
        take: 5,
        select: { id: true, status: true, startedAt: true, completedAt: true, error: true },
      }),
      prisma.workflowRun.count({ where: { workflowId: workflow.id, status: "completed" } }),
      prisma.workflowRun.count({ where: { workflowId: workflow.id, status: "failed" } }),
    ]);

    const totalRuns = successCount + failedCount;
    const successRate = totalRuns > 0 ? Math.round((successCount / totalRuns) * 100) : 0;

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: {
        name: workflow.name,
        workflowStatus: workflow.status,
        runCount: workflow.runCount,
        lastRunAt: workflow.lastRunAt,
        successRate: `${successRate}%`,
        recentRuns: runs,
        message: `**${workflow.name}** — ${workflow.status}\n${workflow.runCount} total runs, ${successRate}% success rate.\nLast run: ${workflow.lastRunAt ? new Date(workflow.lastRunAt).toLocaleDateString() : "never"}`,
      },
    };
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function findWorkflow(userId: string, payload: { id?: string; name?: string }) {
  if (payload.id) {
    return prisma.workflow.findFirst({ where: { id: payload.id, userId } });
  }
  if (payload.name) {
    return prisma.workflow.findFirst({
      where: { userId, name: { contains: payload.name, mode: "insensitive" } },
    });
  }
  return null;
}

function describeTrigger(trigger: { type: string; entityType?: string; conditions?: Record<string, unknown> }): string {
  const labels: Record<string, string> = {
    "record.created": "When a record is created",
    "record.updated": "When a record is updated",
    "record.deleted": "When a record is deleted",
    "score.changed": "When a relationship score changes",
    "enrichment.completed": "When enrichment completes",
    "ai.computed": "When AI attributes are computed",
    "deal.stage_changed": "When a deal changes stage",
    "task.completed": "When a task is completed",
    "email.opened": "When an email is opened",
    "email.clicked": "When an email link is clicked",
  };

  let desc = labels[trigger.type] || trigger.type;
  if (trigger.entityType) desc += ` (${trigger.entityType})`;
  if (trigger.conditions) {
    const conds = Object.entries(trigger.conditions)
      .map(([k, v]) => `${k} = ${v}`)
      .join(", ");
    desc += ` where ${conds}`;
  }
  return desc;
}

function describeStep(step: { type: string; actionType?: string; params?: Record<string, unknown>; field?: string; operator?: string; value?: unknown; delayMinutes?: number }): string {
  switch (step.type) {
    case "action": {
      const actionLabels: Record<string, string> = {
        send_email: "Send email",
        create_task: "Create task",
        update_deal_stage: "Update deal stage",
        send_sms: "Send SMS",
        add_tag: "Add tag",
        enrich_contact: "Enrich contact",
      };
      const label = actionLabels[step.actionType || ""] || step.actionType || "Action";
      if (step.params) {
        const detail = Object.entries(step.params)
          .map(([k, v]) => `${k}: "${v}"`)
          .join(", ");
        return `${label} (${detail})`;
      }
      return label;
    }
    case "condition":
      return `If ${step.field} ${step.operator} ${step.value}`;
    case "delay":
      if ((step.delayMinutes || 0) >= 1440) {
        return `Wait ${Math.round((step.delayMinutes || 0) / 1440)} day(s)`;
      }
      if ((step.delayMinutes || 0) >= 60) {
        return `Wait ${Math.round((step.delayMinutes || 0) / 60)} hour(s)`;
      }
      return `Wait ${step.delayMinutes || 0} minute(s)`;
    case "ai":
      return "Run AI attribute computation";
    default:
      return step.type;
  }
}
