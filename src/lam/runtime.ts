// ============================================================================
// COLONY LAM - Runtime
// Executes validated action plans with risk tier enforcement
// ============================================================================

import { prisma } from "@/lib/prisma";
import type { Action, ActionPlan } from "./actionSchema";
import { validateAction } from "./actionSchema";

// ============================================================================
// Types
// ============================================================================

export interface ExecutionContext {
  user_id: string;
  run_id: string;
  dry_run?: boolean;
}

export interface ActionResult {
  action_id: string;
  action_type: string;
  status: "success" | "failed" | "skipped" | "approval_required";
  data?: unknown;
  entity_id?: string;
  error?: string;
  before_state?: unknown;
  after_state?: unknown;
}

export interface ExecutionResult {
  run_id: string;
  status: "completed" | "partial" | "failed" | "approval_required";
  actions_executed: number;
  actions_skipped: number;
  actions_failed: number;
  actions_pending_approval: number;
  results: ActionResult[];
  user_summary: string;
  pending_tier2_actions?: Action[];
}

// ============================================================================
// Idempotency Handling
// ============================================================================

async function checkIdempotency(
  idempotencyKey: string
): Promise<{ exists: boolean; result?: unknown }> {
  const existing = await prisma.lamIdempotencyKey.findUnique({
    where: { key: idempotencyKey },
  });

  if (existing) {
    return { exists: true, result: existing.resultJson };
  }
  return { exists: false };
}

async function recordIdempotency(
  idempotencyKey: string,
  runId: string,
  result: unknown
): Promise<void> {
  await prisma.lamIdempotencyKey.create({
    data: {
      key: idempotencyKey,
      runId,
      resultJson: result as object,
    },
  });
}

// ============================================================================
// Change Log Recording
// ============================================================================

async function recordChange(
  runId: string,
  actionId: string,
  entityType: string,
  entityId: string,
  operation: "create" | "update" | "delete",
  before: unknown,
  after: unknown
): Promise<void> {
  await prisma.lamChangeLog.create({
    data: {
      runId,
      actionId,
      entityType,
      entityId,
      operation,
      beforeJson: before === null ? undefined : (before as object),
      afterJson: after === null ? undefined : (after as object),
    },
  });
}

// ============================================================================
// Action Executors
// ============================================================================

type ActionExecutor = (
  action: Action,
  ctx: ExecutionContext
) => Promise<ActionResult>;

const executors: Record<string, ActionExecutor> = {
  "lead.create": async (action, ctx) => {
    if (action.type !== "lead.create") throw new Error("Invalid action type");

    const payload = action.payload;

    const contact = await prisma.contact.create({
      data: {
        userId: ctx.user_id,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        source: payload.source,
        type: payload.type || "lead",
        tags: payload.tags || [],
        notes: payload.notes,
      },
    });

    await recordChange(
      ctx.run_id,
      action.action_id,
      "Contact",
      contact.id,
      "create",
      null,
      contact
    );

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: contact,
      entity_id: contact.id,
      after_state: contact,
    };
  },

  "lead.update": async (action, ctx) => {
    if (action.type !== "lead.update") throw new Error("Invalid action type");

    // Extract all possible sources for contact identification
    const rawPayload = action.payload as Record<string, unknown>;
    const patchObj = (rawPayload.patch || {}) as Record<string, unknown>;
    
    // Get ID from multiple possible locations
    let contactId: string | undefined = undefined;
    if (typeof rawPayload.id === 'string' && rawPayload.id.length > 0) {
      contactId = rawPayload.id;
    }
    
    // Get name from multiple possible locations for lookup
    const contactName = 
      (typeof rawPayload.name === 'string' ? rawPayload.name : undefined) ||
      (typeof rawPayload.contactName === 'string' ? rawPayload.contactName : undefined) ||
      (typeof patchObj.name === 'string' ? patchObj.name : undefined);

    console.log("[LAM Runtime] lead.update starting:", {
      contactId,
      contactName,
      rawPayload,
      user_id: ctx.user_id,
    });

    // If no ID, try to find by name
    if (!contactId && contactName) {
      console.log("[LAM Runtime] Looking up contact by name:", contactName);
      
      const found = await prisma.contact.findFirst({
        where: {
          userId: ctx.user_id,
          name: { contains: contactName, mode: "insensitive" },
        },
        orderBy: { updatedAt: "desc" },
      });
      
      if (found) {
        console.log("[LAM Runtime] Found contact:", { id: found.id, name: found.name });
        contactId = found.id;
      } else {
        console.log("[LAM Runtime] Contact not found for user", ctx.user_id);
        
        // Debug: check if it exists for any user
        const anyContact = await prisma.contact.findFirst({
          where: { name: { contains: contactName, mode: "insensitive" } },
        });
        if (anyContact) {
          console.log("[LAM Runtime] Contact exists for different user:", {
            id: anyContact.id,
            name: anyContact.name,
            userId: anyContact.userId,
          });
          return {
            action_id: action.action_id,
            action_type: action.type,
            status: "failed",
            error: `Contact "${contactName}" belongs to a different user. Your user ID: ${ctx.user_id}, Contact owner: ${anyContact.userId}`,
          };
        }
      }
    }

    // Final check - we must have a contact ID at this point
    if (!contactId) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed",
        error: `Cannot find contact. Name searched: "${contactName || 'none provided'}", ID: "${rawPayload.id || 'none provided'}"`,
      };
    }

    console.log("[LAM Runtime] Proceeding with update for contact ID:", contactId);

    // Get before state
    const before = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!before) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed",
        error: `Contact with ID ${contactId} not found in database`,
      };
    }

    // Build clean patch object (filter undefined values)
    const cleanPatch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patchObj)) {
      if (value !== undefined && value !== null) {
        cleanPatch[key] = value;
      }
    }

    console.log("[LAM Runtime] Applying patch:", cleanPatch);

    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: {
        ...cleanPatch,
        updatedAt: new Date(),
      },
    });

    await recordChange(
      ctx.run_id,
      action.action_id,
      "Contact",
      contactId,
      "update",
      before,
      contact
    );

    console.log("[LAM Runtime] Update successful:", { id: contact.id, name: contact.name, tags: contact.tags });

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: contact,
      entity_id: contactId,
      before_state: before,
      after_state: contact,
    };
  },

  "deal.create": async (action, ctx) => {
    if (action.type !== "deal.create") throw new Error("Invalid action type");

    const payload = action.payload;

    const deal = await prisma.deal.create({
      data: {
        userId: ctx.user_id,
        title: payload.title,
        value: payload.value,
        stage: payload.stage || "new_lead",
        contactId: payload.contactId,
        propertyId: payload.propertyId,
        expectedCloseDate: payload.expectedCloseDate
          ? new Date(payload.expectedCloseDate)
          : null,
        notes: payload.notes,
      },
    });

    await recordChange(
      ctx.run_id,
      action.action_id,
      "Deal",
      deal.id,
      "create",
      null,
      deal
    );

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: deal,
      entity_id: deal.id,
      after_state: deal,
    };
  },

  "deal.update": async (action, ctx) => {
    if (action.type !== "deal.update") throw new Error("Invalid action type");

    const { id, patch } = action.payload;

    const before = await prisma.deal.findUnique({ where: { id } });
    if (!before) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed",
        error: `Deal ${id} not found`,
      };
    }

    const deal = await prisma.deal.update({
      where: { id },
      data: {
        ...patch,
        expectedCloseDate: patch.expectedCloseDate
          ? new Date(patch.expectedCloseDate)
          : undefined,
        updatedAt: new Date(),
      },
    });

    await recordChange(
      ctx.run_id,
      action.action_id,
      "Deal",
      id,
      "update",
      before,
      deal
    );

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: deal,
      entity_id: id,
      before_state: before,
      after_state: deal,
    };
  },

  "deal.moveStage": async (action, ctx) => {
    if (action.type !== "deal.moveStage")
      throw new Error("Invalid action type");

    const { id, to_stage } = action.payload;

    const before = await prisma.deal.findUnique({ where: { id } });
    if (!before) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed",
        error: `Deal ${id} not found`,
      };
    }

    const deal = await prisma.deal.update({
      where: { id },
      data: {
        stage: to_stage,
        updatedAt: new Date(),
      },
    });

    await recordChange(
      ctx.run_id,
      action.action_id,
      "Deal",
      id,
      "update",
      before,
      deal
    );

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: deal,
      entity_id: id,
      before_state: before,
      after_state: deal,
    };
  },

  "task.create": async (action, ctx) => {
    if (action.type !== "task.create") throw new Error("Invalid action type");

    const payload = action.payload;

    const task = await prisma.task.create({
      data: {
        userId: ctx.user_id,
        title: payload.title,
        description: payload.description,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        priority: payload.priority || "medium",
        contactId: payload.contactId,
        dealId: payload.dealId,
        propertyId: payload.propertyId,
        completed: false,
      },
    });

    await recordChange(
      ctx.run_id,
      action.action_id,
      "Task",
      task.id,
      "create",
      null,
      task
    );

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: task,
      entity_id: task.id,
      after_state: task,
    };
  },

  "task.complete": async (action, ctx) => {
    if (action.type !== "task.complete")
      throw new Error("Invalid action type");

    const { id } = action.payload;

    const before = await prisma.task.findUnique({ where: { id } });
    if (!before) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed",
        error: `Task ${id} not found`,
      };
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        completed: true,
        updatedAt: new Date(),
      },
    });

    await recordChange(
      ctx.run_id,
      action.action_id,
      "Task",
      id,
      "update",
      before,
      task
    );

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: task,
      entity_id: id,
      before_state: before,
      after_state: task,
    };
  },

  "note.append": async (action, ctx) => {
    if (action.type !== "note.append") throw new Error("Invalid action type");

    const payload = action.payload;

    const note = await prisma.note.create({
      data: {
        userId: ctx.user_id,
        body: payload.body,
        contactId: payload.contactId,
        dealId: payload.dealId,
      },
    });

    await recordChange(
      ctx.run_id,
      action.action_id,
      "Note",
      note.id,
      "create",
      null,
      note
    );

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: note,
      entity_id: note.id,
      after_state: note,
    };
  },

  "crm.search": async (action, _ctx) => {
    if (action.type !== "crm.search") throw new Error("Invalid action type");

    const { entity, query, filters, limit } = action.payload;

    let results: unknown[] = [];

    switch (entity) {
      case "contact": {
        results = await prisma.contact.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } },
            ],
            ...(filters?.type ? { type: filters.type } : {}),
            ...(filters?.source ? { source: filters.source } : {}),
          },
          take: limit || 10,
          orderBy: { updatedAt: "desc" },
        });
        break;
      }
      case "deal": {
        results = await prisma.deal.findMany({
          where: {
            title: { contains: query, mode: "insensitive" },
            ...(filters?.stage ? { stage: filters.stage } : {}),
          },
          take: limit || 10,
          orderBy: { updatedAt: "desc" },
        });
        break;
      }
      case "task": {
        results = await prisma.task.findMany({
          where: {
            title: { contains: query, mode: "insensitive" },
            ...(filters?.status
              ? { completed: filters.status === "completed" }
              : {}),
          },
          take: limit || 10,
          orderBy: { updatedAt: "desc" },
        });
        break;
      }
      case "property": {
        results = await prisma.property.findMany({
          where: {
            OR: [
              { address: { contains: query, mode: "insensitive" } },
              { city: { contains: query, mode: "insensitive" } },
            ],
            ...(filters?.status ? { status: filters.status } : {}),
          },
          take: limit || 10,
          orderBy: { updatedAt: "desc" },
        });
        break;
      }
    }

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: results,
    };
  },

  // Tier 2 actions - stubbed but gated
  "email.send": async (action, _ctx) => {
    if (action.type !== "email.send") throw new Error("Invalid action type");

    // In production, this would integrate with email provider
    // For now, we just return a stubbed success
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: {
        message: "Email sent (stubbed)",
        to: action.payload.contactId,
        subject: action.payload.subject,
      },
    };
  },

  "sms.send": async (action, _ctx) => {
    if (action.type !== "sms.send") throw new Error("Invalid action type");

    // Stubbed
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: {
        message: "SMS sent (stubbed)",
        to: action.payload.contactId,
      },
    };
  },
};

// ============================================================================
// Main Executor
// ============================================================================

async function executeAction(
  action: Action,
  ctx: ExecutionContext
): Promise<ActionResult> {
  // Validate action
  const validation = validateAction(action);
  if (!validation.success) {
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "failed",
      error: `Validation failed: ${validation.error.message}`,
    };
  }

  // Check idempotency
  const idempotencyCheck = await checkIdempotency(action.idempotency_key);
  if (idempotencyCheck.exists) {
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: idempotencyCheck.result,
    };
  }

  // Find executor
  const executor = executors[action.type];
  if (!executor) {
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "failed",
      error: `No executor for action type: ${action.type}`,
    };
  }

  // Execute
  try {
    const result = await executor(action, ctx);

    // Record idempotency key
    if (result.status === "success") {
      await recordIdempotency(action.idempotency_key, ctx.run_id, result.data);
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "failed",
      error: message,
    };
  }
}

/**
 * Execute an action plan with risk tier enforcement
 */
export async function executePlan(
  plan: ActionPlan,
  ctx: ExecutionContext
): Promise<ExecutionResult> {
  const results: ActionResult[] = [];
  let actionsExecuted = 0;
  let actionsSkipped = 0;
  let actionsFailed = 0;
  let actionsPendingApproval = 0;
  const pendingTier2Actions: Action[] = [];

  // Group actions by risk tier
  const tier0Actions = plan.actions.filter((a) => a.risk_tier === 0);
  const tier1Actions = plan.actions.filter((a) => a.risk_tier === 1);
  const tier2Actions = plan.actions.filter((a) => a.risk_tier === 2);

  // Execute Tier 0 (read-only) actions
  for (const action of tier0Actions) {
    if (ctx.dry_run) {
      results.push({
        action_id: action.action_id,
        action_type: action.type,
        status: "skipped",
      });
      actionsSkipped++;
      continue;
    }

    const result = await executeAction(action, ctx);
    results.push(result);
    if (result.status === "success") {
      actionsExecuted++;
    } else if (result.status === "failed") {
      actionsFailed++;
    }
  }

  // Execute Tier 1 (mutations) actions
  for (const action of tier1Actions) {
    if (ctx.dry_run) {
      results.push({
        action_id: action.action_id,
        action_type: action.type,
        status: "skipped",
      });
      actionsSkipped++;
      continue;
    }

    const result = await executeAction(action, ctx);
    results.push(result);
    if (result.status === "success") {
      actionsExecuted++;
    } else if (result.status === "failed") {
      actionsFailed++;
    }
  }

  // Tier 2 actions require approval - don't execute
  for (const action of tier2Actions) {
    pendingTier2Actions.push(action);
    results.push({
      action_id: action.action_id,
      action_type: action.type,
      status: "approval_required",
    });
    actionsPendingApproval++;
  }

  // Determine overall status
  let status: ExecutionResult["status"];
  if (actionsPendingApproval > 0) {
    status = "approval_required";
  } else if (actionsFailed > 0 && actionsExecuted > 0) {
    status = "partial";
  } else if (actionsFailed > 0) {
    status = "failed";
  } else {
    status = "completed";
  }

  // Generate user summary
  const summaryParts: string[] = [];
  if (actionsExecuted > 0) {
    summaryParts.push(`${actionsExecuted} action(s) completed`);
  }
  if (actionsFailed > 0) {
    summaryParts.push(`${actionsFailed} action(s) failed`);
  }
  if (actionsPendingApproval > 0) {
    summaryParts.push(`${actionsPendingApproval} action(s) pending approval`);
  }

  return {
    run_id: ctx.run_id,
    status,
    actions_executed: actionsExecuted,
    actions_skipped: actionsSkipped,
    actions_failed: actionsFailed,
    actions_pending_approval: actionsPendingApproval,
    results,
    user_summary:
      summaryParts.join(", ") || "No actions executed",
    pending_tier2_actions:
      pendingTier2Actions.length > 0 ? pendingTier2Actions : undefined,
  };
}

/**
 * Execute pending Tier 2 actions after approval
 */
export async function executeApprovedActions(
  runId: string,
  userId: string
): Promise<ExecutionResult> {
  // Get the run with pending actions
  const run = await prisma.lamRun.findUnique({
    where: { id: runId },
    include: {
      actions: {
        where: { status: "pending", riskTier: 2 },
      },
    },
  });

  if (!run) {
    return {
      run_id: runId,
      status: "failed",
      actions_executed: 0,
      actions_skipped: 0,
      actions_failed: 1,
      actions_pending_approval: 0,
      results: [],
      user_summary: "Run not found",
    };
  }

  const ctx: ExecutionContext = {
    user_id: userId,
    run_id: runId,
  };

  const results: ActionResult[] = [];
  let actionsExecuted = 0;
  let actionsFailed = 0;

  for (const lamAction of run.actions) {
    const action = lamAction.payloadJson as unknown as Action;
    const result = await executeAction(action, ctx);
    results.push(result);

    // Update action status in DB
    await prisma.lamAction.update({
      where: { id: lamAction.id },
      data: {
        status: result.status === "success" ? "executed" : "failed",
        resultJson: result as object,
        executedAt: new Date(),
      },
    });

    if (result.status === "success") {
      actionsExecuted++;
    } else {
      actionsFailed++;
    }
  }

  // Update run status
  await prisma.lamRun.update({
    where: { id: runId },
    data: {
      status: actionsFailed > 0 ? "failed" : "completed",
      completedAt: new Date(),
    },
  });

  return {
    run_id: runId,
    status: actionsFailed > 0 ? "partial" : "completed",
    actions_executed: actionsExecuted,
    actions_skipped: 0,
    actions_failed: actionsFailed,
    actions_pending_approval: 0,
    results,
    user_summary: `Executed ${actionsExecuted} approved action(s)`,
  };
}

