// ============================================================================
// COLONY LAM - Runtime
// Executes validated action plans with risk tier enforcement
// ============================================================================

import { prisma } from "@/lib/prisma";
import { sendSMS } from "@/lib/twilio";
import { sendGmailEmail } from "@/lib/gmail";
import { createMetaClient } from "@/lib/meta/client";
import { syncMetaAdAccount } from "@/lib/meta/sync";
import type { CreateAdSetParams } from "@/lib/meta/types";
import type { Action, ActionPlan } from "./actionSchema";
import { validateAction } from "./actionSchema";
import { getDefaultProvider } from "./llm";

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
// Team Lookup Helper
// ============================================================================

async function getUserActiveTeamId(userId: string): Promise<string | null> {
  const membership = await prisma.teamMember.findFirst({
    where: { userId },
    orderBy: { joinedAt: "desc" },
    select: { teamId: true },
  });
  return membership?.teamId ?? null;
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

    try {
      await prisma.activity.create({
        data: {
          userId: ctx.user_id,
          type: "note",
          title: `Added new contact: ${contact.name}`,
          contactId: contact.id,
        },
      });
    } catch (e) {
      console.error("[LAM Runtime] Failed to log activity for lead.create:", e);
    }

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

    try {
      await prisma.activity.create({
        data: {
          userId: ctx.user_id,
          type: "note",
          title: `Updated contact: ${contact.name}`,
          description: `Changed: ${Object.keys(cleanPatch).join(", ")}`,
          contactId: contactId,
        },
      });
    } catch (e) {
      console.error("[LAM Runtime] Failed to log activity for lead.update:", e);
    }

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

    try {
      await prisma.activity.create({
        data: {
          userId: ctx.user_id,
          type: "deal_update",
          title: `Created deal: ${deal.title}`,
          dealId: deal.id,
          contactId: deal.contactId,
        },
      });
    } catch (e) {
      console.error("[LAM Runtime] Failed to log activity for deal.create:", e);
    }

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

    try {
      await prisma.activity.create({
        data: {
          userId: ctx.user_id,
          type: "deal_update",
          title: `${deal.title} moved to ${deal.stage}`,
          description: `From ${before.stage} to ${deal.stage}`,
          dealId: deal.id,
        },
      });
    } catch (e) {
      console.error("[LAM Runtime] Failed to log activity for deal.moveStage:", e);
    }

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

    try {
      await prisma.activity.create({
        data: {
          userId: ctx.user_id,
          type: "note",
          title: `Created task: ${task.title}`,
          contactId: task.contactId,
          dealId: task.dealId,
        },
      });
    } catch (e) {
      console.error("[LAM Runtime] Failed to log activity for task.create:", e);
    }

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

    try {
      await prisma.activity.create({
        data: {
          userId: ctx.user_id,
          type: "task_completed",
          title: `Completed: ${task.title}`,
          contactId: task.contactId,
          dealId: task.dealId,
        },
      });
    } catch (e) {
      console.error("[LAM Runtime] Failed to log activity for task.complete:", e);
    }

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

    try {
      await prisma.activity.create({
        data: {
          userId: ctx.user_id,
          type: "note",
          title: "Added note",
          description: note.body.slice(0, 100),
          contactId: note.contactId,
          dealId: note.dealId,
        },
      });
    } catch (e) {
      console.error("[LAM Runtime] Failed to log activity for note.append:", e);
    }

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: note,
      entity_id: note.id,
      after_state: note,
    };
  },

  "lead.delete": async (action, ctx) => {
    if (action.type !== "lead.delete") throw new Error("Invalid action type");

    const { id, name } = action.payload as { id?: string; name?: string };
    let contactId = id;

    if (!contactId && name) {
      const found = await prisma.contact.findFirst({
        where: {
          userId: ctx.user_id,
          name: { contains: name, mode: "insensitive" },
        },
      });
      if (found) contactId = found.id;
    }

    if (!contactId) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Could not find contact "${name || id}" to delete`,
      };
    }

    const before = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!before || before.userId !== ctx.user_id) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "Contact not found or belongs to a different user",
      };
    }

    await prisma.contact.delete({ where: { id: contactId } });

    await recordChange(ctx.run_id, action.action_id, "Contact", contactId, "delete", before, null);

    try {
      await prisma.activity.create({
        data: {
          userId: ctx.user_id,
          type: "note",
          title: `Deleted contact: ${before.name}`,
        },
      });
    } catch (e) {
      console.error("[LAM Runtime] Failed to log activity for lead.delete:", e);
    }

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: { deleted: true, name: before.name },
      entity_id: contactId,
      before_state: before,
    };
  },

  "lead.deleteAll": async (action, ctx) => {
    if (action.type !== "lead.deleteAll") throw new Error("Invalid action type");

    const contacts = await prisma.contact.findMany({
      where: { userId: ctx.user_id },
      select: { id: true, name: true },
    });

    const count = contacts.length;
    if (count === 0) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success",
        data: { deleted: 0, message: "No contacts to delete" },
      };
    }

    await prisma.contact.deleteMany({ where: { userId: ctx.user_id } });

    await recordChange(ctx.run_id, action.action_id, "Contact", "ALL", "delete", { count, ids: contacts.map(c => c.id) }, null);

    try {
      await prisma.activity.create({
        data: {
          userId: ctx.user_id,
          type: "note",
          title: `Deleted all contacts (${count})`,
        },
      });
    } catch (e) {
      console.error("[LAM Runtime] Failed to log activity for lead.deleteAll:", e);
    }

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: { deleted: count, message: `Deleted ${count} contact(s)` },
    };
  },

  "deal.delete": async (action, ctx) => {
    if (action.type !== "deal.delete") throw new Error("Invalid action type");

    const { id, title } = action.payload as { id?: string; title?: string };
    let dealId = id;

    if (!dealId && title) {
      const found = await prisma.deal.findFirst({
        where: {
          userId: ctx.user_id,
          title: { contains: title, mode: "insensitive" },
        },
      });
      if (found) dealId = found.id;
    }

    if (!dealId) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Could not find deal "${title || id}" to delete`,
      };
    }

    const before = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!before || before.userId !== ctx.user_id) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "Deal not found or belongs to a different user",
      };
    }

    await prisma.deal.delete({ where: { id: dealId } });

    await recordChange(ctx.run_id, action.action_id, "Deal", dealId, "delete", before, null);

    try {
      await prisma.activity.create({
        data: {
          userId: ctx.user_id,
          type: "deal_update",
          title: `Deleted deal: ${before.title}`,
        },
      });
    } catch (e) {
      console.error("[LAM Runtime] Failed to log activity for deal.delete:", e);
    }

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: { deleted: true, title: before.title },
      entity_id: dealId,
      before_state: before,
    };
  },

  "deal.deleteAll": async (action, ctx) => {
    if (action.type !== "deal.deleteAll") throw new Error("Invalid action type");

    const deals = await prisma.deal.findMany({
      where: { userId: ctx.user_id },
      select: { id: true, title: true },
    });

    const count = deals.length;
    if (count === 0) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success",
        data: { deleted: 0, message: "No deals to delete" },
      };
    }

    await prisma.deal.deleteMany({ where: { userId: ctx.user_id } });

    await recordChange(ctx.run_id, action.action_id, "Deal", "ALL", "delete", { count, ids: deals.map(d => d.id) }, null);

    try {
      await prisma.activity.create({
        data: {
          userId: ctx.user_id,
          type: "deal_update",
          title: `Deleted all deals (${count})`,
        },
      });
    } catch (e) {
      console.error("[LAM Runtime] Failed to log activity for deal.deleteAll:", e);
    }

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: { deleted: count, message: `Deleted ${count} deal(s)` },
    };
  },

  "task.delete": async (action, ctx) => {
    if (action.type !== "task.delete") throw new Error("Invalid action type");

    const { id, title } = action.payload as { id?: string; title?: string };
    let taskId = id;

    if (!taskId && title) {
      const found = await prisma.task.findFirst({
        where: {
          userId: ctx.user_id,
          title: { contains: title, mode: "insensitive" },
        },
      });
      if (found) taskId = found.id;
    }

    if (!taskId) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Could not find task "${title || id}" to delete`,
      };
    }

    const before = await prisma.task.findUnique({ where: { id: taskId } });
    if (!before || before.userId !== ctx.user_id) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "Task not found or belongs to a different user",
      };
    }

    await prisma.task.delete({ where: { id: taskId } });

    await recordChange(ctx.run_id, action.action_id, "Task", taskId, "delete", before, null);

    try {
      await prisma.activity.create({
        data: {
          userId: ctx.user_id,
          type: "note",
          title: `Deleted task: ${before.title}`,
        },
      });
    } catch (e) {
      console.error("[LAM Runtime] Failed to log activity for task.delete:", e);
    }

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: { deleted: true, title: before.title },
      entity_id: taskId,
      before_state: before,
    };
  },

  "task.deleteAll": async (action, ctx) => {
    if (action.type !== "task.deleteAll") throw new Error("Invalid action type");

    const tasks = await prisma.task.findMany({
      where: { userId: ctx.user_id },
      select: { id: true, title: true },
    });

    const count = tasks.length;
    if (count === 0) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success",
        data: { deleted: 0, message: "No tasks to delete" },
      };
    }

    await prisma.task.deleteMany({ where: { userId: ctx.user_id } });

    await recordChange(ctx.run_id, action.action_id, "Task", "ALL", "delete", { count, ids: tasks.map(t => t.id) }, null);

    try {
      await prisma.activity.create({
        data: {
          userId: ctx.user_id,
          type: "note",
          title: `Deleted all tasks (${count})`,
        },
      });
    } catch (e) {
      console.error("[LAM Runtime] Failed to log activity for task.deleteAll:", e);
    }

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: { deleted: count, message: `Deleted ${count} task(s)` },
    };
  },

  "note.delete": async (action, ctx) => {
    if (action.type !== "note.delete") throw new Error("Invalid action type");

    const { id } = action.payload;

    const before = await prisma.note.findUnique({ where: { id } });
    if (!before || before.userId !== ctx.user_id) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "Note not found or belongs to a different user",
      };
    }

    await prisma.note.delete({ where: { id } });

    await recordChange(ctx.run_id, action.action_id, "Note", id, "delete", before, null);

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: { deleted: true },
      entity_id: id,
      before_state: before,
    };
  },

  "crm.search": async (action, ctx) => {
    if (action.type !== "crm.search") throw new Error("Invalid action type");

    const { entity, query, filters, limit } = action.payload;
    const hasQuery = query && query.trim().length > 0;

    let results: unknown[] = [];

    switch (entity) {
      case "contact": {
        results = await prisma.contact.findMany({
          where: {
            userId: ctx.user_id,
            ...(hasQuery
              ? {
                  OR: [
                    { name: { contains: query, mode: "insensitive" } },
                    { email: { contains: query, mode: "insensitive" } },
                    { phone: { contains: query, mode: "insensitive" } },
                  ],
                }
              : {}),
            ...(filters?.type ? { type: filters.type } : {}),
            ...(filters?.source ? { source: filters.source } : {}),
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            type: true,
            source: true,
            tags: true,
            createdAt: true,
            updatedAt: true,
          },
          take: limit || 10,
          orderBy: { updatedAt: "desc" },
        });
        break;
      }
      case "deal": {
        results = await prisma.deal.findMany({
          where: {
            userId: ctx.user_id,
            ...(hasQuery
              ? { title: { contains: query, mode: "insensitive" } }
              : {}),
            ...(filters?.stage ? { stage: filters.stage } : {}),
          },
          select: {
            id: true,
            title: true,
            value: true,
            stage: true,
            notes: true,
            expectedCloseDate: true,
            createdAt: true,
            updatedAt: true,
            contact: { select: { name: true } },
          },
          take: limit || 10,
          orderBy: { updatedAt: "desc" },
        });
        break;
      }
      case "task": {
        results = await prisma.task.findMany({
          where: {
            userId: ctx.user_id,
            ...(hasQuery
              ? { title: { contains: query, mode: "insensitive" } }
              : {}),
            ...(filters?.status
              ? { completed: filters.status === "completed" }
              : {}),
          },
          select: {
            id: true,
            title: true,
            description: true,
            dueDate: true,
            priority: true,
            completed: true,
            createdAt: true,
            contact: { select: { name: true } },
            deal: { select: { title: true } },
          },
          take: limit || 10,
          orderBy: [{ completed: "asc" }, { dueDate: "asc" }],
        });
        break;
      }
      case "property": {
        results = await prisma.property.findMany({
          where: {
            userId: ctx.user_id,
            ...(hasQuery
              ? {
                  OR: [
                    { address: { contains: query, mode: "insensitive" } },
                    { city: { contains: query, mode: "insensitive" } },
                  ],
                }
              : {}),
            ...(filters?.status ? { status: filters.status } : {}),
          },
          select: {
            id: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            price: true,
            status: true,
            bedrooms: true,
            bathrooms: true,
            sqft: true,
            createdAt: true,
          },
          take: limit || 10,
          orderBy: { updatedAt: "desc" },
        });
        break;
      }
      case "referral": {
        results = await prisma.referral.findMany({
          where: {
            createdByUserId: ctx.user_id,
            ...(hasQuery
              ? {
                  OR: [
                    { title: { contains: query, mode: "insensitive" } },
                    { description: { contains: query, mode: "insensitive" } },
                    { category: { contains: query, mode: "insensitive" } },
                  ],
                }
              : {}),
            ...(filters?.status ? { status: filters.status } : {}),
            ...(filters?.category ? { category: filters.category } : {}),
          },
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            status: true,
            locationText: true,
            valueEstimate: true,
            currency: true,
            visibility: true,
            createdAt: true,
            claims: {
              select: {
                id: true,
                status: true,
                message: true,
                createdAt: true,
              },
            },
          },
          take: limit || 10,
          orderBy: { createdAt: "desc" },
        });
        break;
      }
    }

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: { entity, query, total: results.length, records: results },
    };
  },

  "referral.create": async (action, ctx) => {
    if (action.type !== "referral.create") throw new Error("Invalid action type");

    const payload = action.payload as {
      title: string;
      category: string;
      description?: string;
      locationText?: string;
      valueEstimate?: number;
      visibility?: string;
    };

    const referral = await prisma.referral.create({
      data: {
        createdByUserId: ctx.user_id,
        title: payload.title,
        category: payload.category.toLowerCase().replace(/\s+/g, "_"),
        description: payload.description,
        locationText: payload.locationText,
        valueEstimate: payload.valueEstimate,
        visibility: payload.visibility || "public",
        status: "open",
      },
    });

    await prisma.referralParticipant.create({
      data: {
        referralId: referral.id,
        userId: ctx.user_id,
        role: "creator",
      },
    });

    await recordChange(
      ctx.run_id,
      action.action_id,
      "Referral",
      referral.id,
      "create",
      null,
      referral
    );

    try {
      const teamId = await getUserActiveTeamId(ctx.user_id);
      await prisma.activity.create({
        data: {
          userId: ctx.user_id,
          teamId,
          type: "note",
          title: `Posted referral: ${referral.title}`,
          description: `Category: ${referral.category}${referral.locationText ? `, Location: ${referral.locationText}` : ""}`,
        },
      });
    } catch (e) {
      console.error("[LAM Runtime] Failed to log activity for referral.create:", e);
    }

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: referral,
      entity_id: referral.id,
      after_state: referral,
    };
  },

  "email.send": async (action, ctx) => {
    if (action.type !== "email.send") throw new Error("Invalid action type");

    const { contactId, subject, body, to: directEmail } = action.payload as {
      contactId?: string;
      subject: string;
      body: string;
      to?: string;
    };

    let recipientEmail = directEmail;
    let recipientName = directEmail ?? "recipient";
    let resolvedContactId = contactId;

    if (contactId) {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
      });

      if (!contact) {
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "failed" as const,
          error: "Contact not found",
        };
      }

      if (contact.userId !== ctx.user_id) {
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "failed" as const,
          error: "Contact belongs to a different user",
        };
      }

      if (!contact.email) {
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "failed" as const,
          error: `${contact.name} doesn't have an email on file`,
        };
      }

      recipientEmail = contact.email;
      recipientName = contact.name;
      resolvedContactId = contact.id;
    }

    if (!recipientEmail) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "No email address provided and no contactId to look up",
      };
    }

    const emailAccount = await prisma.emailAccount.findFirst({
      where: { userId: ctx.user_id, isDefault: true },
    });

    if (!emailAccount) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error:
          "You haven't connected an email account yet. Go to Settings to connect Gmail.",
      };
    }

    const result = await sendGmailEmail({
      emailAccountId: emailAccount.id,
      to: recipientEmail,
      subject,
      body,
    });

    await prisma.activity.create({
      data: {
        userId: ctx.user_id,
        type: "email",
        title: `Email sent to ${recipientName}`,
        description: subject,
        metadata: JSON.stringify({
          messageId: result.messageId,
          threadId: result.threadId,
          to: recipientEmail,
          subject,
        }),
        contactId: resolvedContactId,
      },
    });

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success" as const,
      data: {
        messageId: result.messageId,
        threadId: result.threadId,
        to: recipientEmail,
        recipientName,
        message: `Email sent to ${recipientName}`,
      },
    };
  },

  "sms.send": async (action, ctx) => {
    if (action.type !== "sms.send") throw new Error("Invalid action type");

    const { contactId, phoneNumber, message } = action.payload as {
      contactId?: string;
      phoneNumber?: string;
      message: string;
    };

    let to = phoneNumber;
    let recipientName = phoneNumber ?? "unknown";

    if (contactId) {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
      });

      if (!contact) {
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "failed" as const,
          error: "Contact not found",
        };
      }

      if (contact.userId !== ctx.user_id) {
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "failed" as const,
          error: "Contact belongs to a different user",
        };
      }

      if (!contact.phone) {
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "failed" as const,
          error: `${contact.name} doesn't have a phone number on file`,
        };
      }

      to = contact.phone;
      recipientName = contact.name;
    }

    if (!to) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "No phone number provided and no contactId to look up",
      };
    }

    const result = await sendSMS(to, message);

    await prisma.sMSMessage.create({
      data: {
        profileId: ctx.user_id,
        direction: "outbound",
        from: process.env.TWILIO_PHONE_NUMBER!,
        to,
        body: message,
        twilioSid: result.sid,
        status: "sent",
        lamRunId: ctx.run_id,
      },
    });

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success" as const,
      data: {
        sid: result.sid,
        to,
        recipientName,
        message: `SMS sent to ${recipientName}`,
      },
    };
  },

  "ads.check_performance": async (action, ctx) => {
    if (action.type !== "ads.check_performance") throw new Error("Invalid action type");

    const payload = action.payload as { campaign_name?: string };

    const metaData: { campaigns: unknown[]; weekly_totals: unknown; last_synced: unknown; account_name: unknown } | null = await (async () => {
      const adAccount = await prisma.metaAdAccount.findFirst({
        where: { userId: ctx.user_id, status: "active" },
      });
      if (!adAccount) return null;

      const whereClause: Record<string, unknown> = { adAccountId: adAccount.id };
      if (payload.campaign_name) {
        whereClause.name = { contains: payload.campaign_name, mode: "insensitive" };
      }

      const campaigns = await prisma.metaCampaign.findMany({
        where: whereClause,
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: { id: true, name: true, objective: true, status: true, effectiveStatus: true, dailyBudget: true, impressions: true, clicks: true, spend: true, reach: true, conversions: true, updatedAt: true },
      });

      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);
      const recentInsights = await prisma.metaInsight.findMany({
        where: { adAccountId: adAccount.id, date: { gte: last7Days } },
        orderBy: { date: "desc" },
        take: 30,
      });

      const weeklyTotals = recentInsights.reduce(
        (acc, i) => ({ impressions: acc.impressions + i.impressions, clicks: acc.clicks + i.clicks, spend: acc.spend + i.spend, conversions: acc.conversions + i.conversions }),
        { impressions: 0, clicks: 0, spend: 0, conversions: 0 }
      );

      return { campaigns, weekly_totals: weeklyTotals, last_synced: adAccount.lastSyncedAt, account_name: adAccount.adAccountName };
    })();

    const honeycombWhere: Record<string, unknown> = { userId: ctx.user_id };
    if (payload.campaign_name) {
      honeycombWhere.name = { contains: payload.campaign_name, mode: "insensitive" };
    }

    const honeycombCampaigns = await prisma.honeycombCampaign.findMany({
      where: honeycombWhere,
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { id: true, name: true, channel: true, status: true, objective: true, dailyBudget: true, impressions: true, clicks: true, conversions: true, spend: true, updatedAt: true },
    });

    const campaignIds = honeycombCampaigns.map((c) => c.id);
    const nativeEvents = campaignIds.length > 0
      ? await prisma.adEvent.groupBy({
          by: ["campaignId", "eventType"],
          where: { campaignId: { in: campaignIds } },
          _count: true,
        })
      : [];

    const eventMap: Record<string, { impressions: number; clicks: number }> = {};
    for (const ev of nativeEvents) {
      if (!eventMap[ev.campaignId]) eventMap[ev.campaignId] = { impressions: 0, clicks: 0 };
      if (ev.eventType === "impression") eventMap[ev.campaignId].impressions += ev._count;
      else if (ev.eventType === "click") eventMap[ev.campaignId].clicks += ev._count;
    }

    const llmListings = await prisma.llmListing.findMany({
      where: { userId: ctx.user_id },
      select: { campaignId: true, businessName: true, impressions: true, clicks: true, serviceArea: true },
    });

    const llmMap = new Map(llmListings.map((l) => [l.campaignId, l]));

    const nativeAndLocalCampaigns = honeycombCampaigns
      .filter((c) => ["native", "local", "llm", "google", "bing"].includes(c.channel))
      .map((c) => {
        const events = eventMap[c.id];
        const listing = llmMap.get(c.id);
        return {
          id: c.id,
          name: c.name,
          channel: c.channel,
          status: c.status,
          objective: c.objective,
          dailyBudget: c.dailyBudget,
          impressions: (events?.impressions || 0) + (listing?.impressions || 0) + c.impressions,
          clicks: (events?.clicks || 0) + (listing?.clicks || 0) + c.clicks,
          conversions: c.conversions,
          updatedAt: c.updatedAt,
        };
      });

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success" as const,
      data: {
        meta: metaData,
        honeycomb_campaigns: nativeAndLocalCampaigns,
        llm_listings: llmListings.map((l) => ({
          business_name: l.businessName,
          impressions: l.impressions,
          clicks: l.clicks,
          service_area: l.serviceArea,
        })),
      },
    };
  },

  "ads.create_campaign": async (action, ctx) => {
    if (action.type !== "ads.create_campaign") throw new Error("Invalid action type");

    const payload = action.payload as {
      channel?: string;
      objective?: string;
      daily_budget?: number;
      name?: string;
      business_name?: string;
      category?: string;
      description?: string;
      service_area?: string;
      phone?: string;
      website?: string;
      keywords?: string[];
      special_ad_category?: string;
      target_city?: string;
      target_radius?: number;
      lead_type?: string;
      listing_focus?: boolean;
      target_price_max?: number;
      target_price_min?: number;
      target_bedrooms_min?: number;
    };

    const channel = payload.channel || "native";
    const dailyBudget = payload.daily_budget || 10;
    const campaignName = payload.name || `Tara Campaign - ${new Date().toLocaleDateString()}`;

    switch (channel) {
      case "meta": {
        const adAccount = await prisma.metaAdAccount.findFirst({
          where: { userId: ctx.user_id, status: "active" },
        });

        if (!adAccount) {
          return {
            action_id: action.action_id,
            action_type: action.type,
            status: "failed" as const,
            error: "To run Facebook/Instagram ads, you'll need to connect your Meta account first. Go to Settings > Integrations > Connect Facebook. Once connected, I can create and manage your campaigns right from here.",
          };
        }

        if (adAccount.tokenExpiresAt && adAccount.tokenExpiresAt < new Date()) {
          return {
            action_id: action.action_id,
            action_type: action.type,
            status: "failed" as const,
            error: "Your Facebook connection has expired. Go to Settings > Integrations and tap Reconnect, then come back and I'll set up your campaign.",
          };
        }

        const client = createMetaClient(adAccount.accessToken);

        const objectiveMap: Record<string, string> = {
          "LEADS": "OUTCOME_LEADS",
          "TRAFFIC": "OUTCOME_TRAFFIC",
          "AWARENESS": "OUTCOME_AWARENESS",
          "ENGAGEMENT": "OUTCOME_ENGAGEMENT",
          "SALES": "OUTCOME_SALES",
        };

        const objective = objectiveMap[payload.objective?.toUpperCase() || "LEADS"] || "OUTCOME_LEADS";
        const userObjective = payload.objective?.toUpperCase() || "LEADS";

        const profile = await prisma.profile.findUnique({
          where: { id: ctx.user_id },
          select: {
            businessType: true,
            fullName: true,
            avatarUrl: true,
            serviceAreaCity: true,
            serviceAreaRadius: true,
          },
        });

        // Use explicit special_ad_category from chat if provided, otherwise auto-detect from profile
        const explicitCategory = payload.special_ad_category?.toUpperCase();
        const isHousing = explicitCategory === "HOUSING" ||
          (!explicitCategory && (
            profile?.businessType?.toLowerCase().includes("real estate") ||
            profile?.businessType?.toLowerCase().includes("property") ||
            profile?.businessType?.toLowerCase().includes("mortgage")
          ));
        const isCredit = explicitCategory === "CREDIT";
        const isEmployment = explicitCategory === "EMPLOYMENT";
        const specialAdCategories = isHousing ? ["HOUSING"] :
          isCredit ? ["CREDIT"] :
          isEmployment ? ["EMPLOYMENT"] : [];

        try {
          // ---- Step 1: Create Campaign ----
          const campaignResult = await client.createCampaign(adAccount.adAccountId, {
            name: campaignName,
            objective,
            status: "PAUSED",
            special_ad_categories: specialAdCategories,
          });

          // Sync and find the local campaign record
          await syncMetaAdAccount(adAccount.id);
          const newCampaign = await prisma.metaCampaign.findFirst({
            where: { adAccountId: adAccount.id, metaCampaignId: campaignResult.id },
          });

          // ---- Step 2: Generate ad copy via LLM ----
          // Get user's location from their properties or profile metadata
          let userCity = "your city";
          let userState = "";

          // Query matching listings if this is a listing-focused ad
          interface MatchedListing {
            address: string;
            city: string;
            state: string | null;
            price: number;
            bedrooms: number | null;
            bathrooms: number | null;
            sqft: number | null;
            imageUrl: string | null;
          }
          let matchedListings: MatchedListing[] = [];

          if (payload.listing_focus) {
            // Build property filter based on city/price criteria
            const propertyWhere: Record<string, unknown> = { userId: ctx.user_id };

            const listingCity = payload.target_city || profile?.serviceAreaCity;
            if (listingCity) {
              propertyWhere.city = { contains: listingCity, mode: "insensitive" };
            }

            if (payload.target_price_max) {
              propertyWhere.price = { ...(propertyWhere.price as object || {}), lte: payload.target_price_max };
            }
            if (payload.target_price_min) {
              propertyWhere.price = { ...(propertyWhere.price as object || {}), gte: payload.target_price_min };
            }
            if (payload.target_bedrooms_min) {
              propertyWhere.bedrooms = { gte: payload.target_bedrooms_min };
            }

            // Only show active listings (listed or pre_listing)
            propertyWhere.status = { in: ["listed", "pre_listing"] };

            matchedListings = await prisma.property.findMany({
              where: propertyWhere,
              select: {
                address: true,
                city: true,
                state: true,
                price: true,
                bedrooms: true,
                bathrooms: true,
                sqft: true,
                imageUrl: true,
              },
              orderBy: { price: "asc" },
              take: 10,
            }) as MatchedListing[];
          }

          const userProperty = await prisma.property.findFirst({
            where: { userId: ctx.user_id },
            select: { city: true, state: true, imageUrl: true },
            orderBy: { updatedAt: "desc" },
          });

          if (payload.target_city) {
            userCity = payload.target_city;
          } else if (profile?.serviceAreaCity) {
            userCity = profile.serviceAreaCity;
          } else if (userProperty?.city) {
            userCity = userProperty.city;
            userState = userProperty.state || "";
          }

          const businessType = profile?.businessType || "business";

          let adCopy = { headline: campaignName, primary_text: `Discover ${businessType} services in ${userCity}`, description: "Learn more today" };
          try {
            const llm = getDefaultProvider();

            // Build a listing-aware prompt if we have matched listings
            let copyPrompt: string;
            if (payload.listing_focus && matchedListings.length > 0) {
              const listingSummary = matchedListings.slice(0, 5).map(l => {
                const parts = [`$${l.price.toLocaleString()}`];
                if (l.bedrooms) parts.push(`${l.bedrooms}bd`);
                if (l.bathrooms) parts.push(`${l.bathrooms}ba`);
                if (l.sqft) parts.push(`${l.sqft.toLocaleString()} sqft`);
                parts.push(l.address);
                return parts.join(" · ");
              }).join("\n");

              const priceLabel = payload.target_price_max
                ? `under $${payload.target_price_max.toLocaleString()}`
                : "";

              copyPrompt = `Write a Facebook ad promoting real estate listings in ${userCity}${userState ? `, ${userState}` : ""} ${priceLabel}. I have ${matchedListings.length} matching listings:\n${listingSummary}\n\nReturn JSON only with fields: headline (max 40 chars — mention the city and price range), primary_text (max 125 chars — highlight the # of listings available and the value), description (max 30 chars). Make it compelling for home buyers searching in this area and price range.`;
            } else if (payload.listing_focus) {
              // Listing focus but no matching properties found
              const priceLabel = payload.target_price_max
                ? ` under $${payload.target_price_max.toLocaleString()}`
                : "";
              copyPrompt = `Write a Facebook ad for a real estate agent promoting homes${priceLabel} in ${userCity}${userState ? `, ${userState}` : ""}. Return JSON only with fields: headline (max 40 chars — mention the city and price range), primary_text (max 125 chars — focus on helping buyers find homes in this price range), description (max 30 chars). Be specific and compelling.`;
            } else {
              copyPrompt = `Write a Facebook ad for a ${businessType} in ${userCity}${userState ? `, ${userState}` : ""}. Return JSON only with fields: headline (max 40 chars), primary_text (max 125 chars), description (max 30 chars). Be specific to the area and business type. No generic copy.`;
            }

            const copyResponse = await llm.complete([
              { role: "system", content: "You generate Facebook ad copy. Return JSON only, no markdown." },
              { role: "user", content: copyPrompt },
            ], { temperature: 0.7 });

            let jsonStr = copyResponse.content.trim();
            if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
            if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
            if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
            jsonStr = jsonStr.trim();
            const parsed = JSON.parse(jsonStr);
            adCopy = {
              headline: String(parsed.headline || adCopy.headline).slice(0, 40),
              primary_text: String(parsed.primary_text || adCopy.primary_text).slice(0, 125),
              description: String(parsed.description || adCopy.description).slice(0, 30),
            };
          } catch {
            // Fallback to defaults if LLM fails
            if (payload.listing_focus) {
              const priceLabel = payload.target_price_max ? ` Under $${(payload.target_price_max / 1000).toFixed(0)}K` : "";
              adCopy = {
                headline: `${userCity} Homes${priceLabel}`.slice(0, 40),
                primary_text: `Browse ${matchedListings.length || ""} available listings in ${userCity}${priceLabel}. Find your dream home today!`.slice(0, 125),
                description: "View listings now".slice(0, 30),
              };
            }
          }

          // ---- Step 3: Find image and upload ----
          let imageHash: string | null = null;
          // Use the first matched listing's image if available, otherwise fall back to any property
          const propertyImageUrl = (matchedListings.length > 0
            ? matchedListings.find(l => l.imageUrl)?.imageUrl
            : userProperty?.imageUrl) || null;

          // Priority: property photo > AI-generated image
          let imageSource = propertyImageUrl || null;

          // If no property image, generate one with DALL-E
          if (!imageSource && process.env.OPENAI_API_KEY) {
            try {
              const { generateImage, buildAdImagePrompt } = await import("@/lib/image-gen");
              const imgType = payload.listing_focus ? "new_listing" : (payload.lead_type || "lead_generation");
              const prompt = buildAdImagePrompt({
                type: imgType,
                city: userCity,
                state: userState,
                businessType,
                propertyDetails: matchedListings.length > 0 ? {
                  bedrooms: matchedListings[0].bedrooms || undefined,
                  sqft: matchedListings[0].sqft || undefined,
                  price: matchedListings[0].price || undefined,
                } : undefined,
              });
              const generated = await generateImage({ prompt, size: "1024x1024" });
              imageSource = generated.url;
            } catch (imgGenErr) {
              console.error("[META ADS] DALL-E image generation failed:", imgGenErr);
              // Continue without image
            }
          }

          if (imageSource) {
            try {
              const uploadResult = await client.uploadImage(adAccount.adAccountId, imageSource);
              imageHash = uploadResult.hash;
            } catch {
              // Continue without image — will create a link ad
            }
          }

          // ---- Step 4: Create Ad Set with Advantage+ targeting ----
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);

          const optimizationGoal = userObjective === "LEADS" ? "LEAD_GENERATION" : "LINK_CLICKS";

          // Build targeting — use payload city > service area city > property city
          // Note: Advantage+ audience is NOT allowed for housing/credit/employment special ad categories
          const targeting: Record<string, unknown> = {};
          if (specialAdCategories.length === 0) {
            targeting.targeting_automation = { advantage_audience: 1 };
          }
          const targetCityName = payload.target_city || profile?.serviceAreaCity || userProperty?.city;
          const targetRadius = payload.target_radius || profile?.serviceAreaRadius || 25;
          if (targetCityName) {
            // Look up the Meta geo targeting key for the city (integer, not string)
            const cityResult = await client.searchCity(targetCityName);
            if (cityResult) {
              targeting.geo_locations = {
                cities: [{ key: cityResult.key, radius: targetRadius, distance_unit: "mile" }],
              };
            }

            // Save as the user's service area if they don't have one yet
            if (!profile?.serviceAreaCity) {
              await prisma.profile.update({
                where: { id: ctx.user_id },
                data: { serviceAreaCity: targetCityName, serviceAreaRadius: targetRadius },
              }).catch(() => {}); // non-critical
            }
          }

          // ---- Resolve Facebook Page ID + Page Access Token (needed for ad set + creative) ----
          let effectivePageId = (adAccount.metadata as Record<string, unknown>)?.pageId as string || "";
          let pageAccessToken = (adAccount.metadata as Record<string, unknown>)?.pageAccessToken as string || "";

          if (!effectivePageId || !pageAccessToken) {
            // Try to get pages from Meta API (includes page access tokens)
            try {
              const pagesRes = await client.getPages();
              if (pagesRes.length > 0) {
                effectivePageId = pagesRes[0].id;
                pageAccessToken = pagesRes[0].access_token || "";
                // Save for future use
                await prisma.metaAdAccount.update({
                  where: { id: adAccount.id },
                  data: {
                    metadata: {
                      ...(adAccount.metadata as Record<string, unknown> || {}),
                      pageId: effectivePageId,
                      pageAccessToken: pageAccessToken,
                    },
                  },
                }).catch(() => {});
              }
            } catch {
              // Can't get pages
            }
          }

          if (!effectivePageId) {
            return {
              action_id: action.action_id,
              action_type: action.type,
              status: "failed" as const,
              error: "A Facebook Page is required to create ads. Make sure you have a Facebook Page connected to your ad account, then try again.",
            };
          }

          console.log("[ADS] Using Facebook Page ID:", effectivePageId);

          const adSetResult = await client.createAdSet(adAccount.adAccountId, {
            name: `${campaignName} - Ad Set`,
            campaign_id: campaignResult.id,
            billing_event: "IMPRESSIONS",
            optimization_goal: optimizationGoal as "LEAD_GENERATION" | "LINK_CLICKS",
            daily_budget: dailyBudget * 100, // Convert dollars to cents
            bid_strategy: "LOWEST_COST_WITHOUT_CAP",
            targeting: targeting as CreateAdSetParams["targeting"],
            start_time: tomorrow.toISOString(),
            status: "PAUSED",
            special_ad_categories: specialAdCategories,
            promoted_object: { page_id: effectivePageId },
          });

          // ---- Step 5: Create Ad Creative ----
          // Determine landing page URL
          const landingUrl = payload.website || `${process.env.NEXT_PUBLIC_APP_URL || "https://mycolonyhq.com"}`;

          let creativeResult: { id: string };
          try {
            if (effectivePageId) {
              // Use a page-token-authenticated client for object_story_spec if available
              // This avoids permission errors when the user token lacks pages_manage_ads
              const creativeClient = pageAccessToken
                ? createMetaClient(pageAccessToken)
                : client;

              console.log("[ADS] Creating creative with", pageAccessToken ? "page token" : "user token");

              // Page-based creative (required for housing, preferred for all)
              try {
                creativeResult = await creativeClient.createAdCreative(adAccount.adAccountId, {
                  name: `${campaignName} - Creative`,
                  object_story_spec: {
                    page_id: effectivePageId,
                    link_data: {
                      ...(imageHash ? { image_hash: imageHash } : {}),
                      message: adCopy.primary_text,
                      link: landingUrl,
                      name: adCopy.headline,
                      description: adCopy.description,
                      call_to_action: { type: "LEARN_MORE" },
                    },
                  },
                });
              } catch (pageCreativeError) {
                const errMsg = pageCreativeError instanceof Error ? pageCreativeError.message : "";
                console.error("[ADS] Creative with object_story_spec failed:", errMsg);

                // Fall back to asset_feed_spec for non-housing ads
                if (specialAdCategories.length === 0) {
                  console.warn("[ADS] Falling back to asset_feed_spec");
                  creativeResult = await client.createAdCreative(adAccount.adAccountId, {
                    name: `${campaignName} - Creative`,
                    asset_feed_spec: {
                      bodies: [{ text: adCopy.primary_text }],
                      titles: [{ text: adCopy.headline }],
                      descriptions: [{ text: adCopy.description }],
                      ad_formats: ["SINGLE_IMAGE"],
                      call_to_action_types: ["LEARN_MORE"],
                      link_urls: [{ website_url: landingUrl }],
                    },
                    degrees_of_freedom_spec: {
                      creative_features_spec: {
                        standard_enhancements: { enroll_status: "OPT_IN" },
                      },
                    },
                  });
                } else {
                  // Housing ads require page creative — surface the actual Meta error
                  throw new Error(
                    `Ad creative failed: ${errMsg}. ` +
                    `Try reconnecting Facebook in Settings to refresh your Page permissions.`
                  );
                }
              }
            } else {
              // No page — use asset_feed_spec (non-housing only)
              creativeResult = await client.createAdCreative(adAccount.adAccountId, {
                name: `${campaignName} - Creative`,
                asset_feed_spec: {
                  bodies: [{ text: adCopy.primary_text }],
                  titles: [{ text: adCopy.headline }],
                  descriptions: [{ text: adCopy.description }],
                  ad_formats: ["SINGLE_IMAGE"],
                  call_to_action_types: ["LEARN_MORE"],
                  link_urls: [{ website_url: landingUrl }],
                },
                degrees_of_freedom_spec: {
                  creative_features_spec: {
                    standard_enhancements: { enroll_status: "OPT_IN" },
                  },
                },
              });
            }
          } catch (creativeError) {
            const msg = creativeError instanceof Error ? creativeError.message : "Unknown creative error";
            return {
              action_id: action.action_id,
              action_type: action.type,
              status: "failed" as const,
              error: `Campaign and ad set created, but ad creative failed: ${msg}`,
            };
          }

          // ---- Step 6: Create Ad ----
          let adResult: { id: string };
          try {
            adResult = await client.createAd(adAccount.adAccountId, {
              name: `${campaignName} - Ad`,
              adset_id: adSetResult.id,
              creative: { creative_id: creativeResult.id },
              status: "PAUSED",
            });
          } catch (adError) {
            const msg = adError instanceof Error ? adError.message : "Unknown ad error";
            return {
              action_id: action.action_id,
              action_type: action.type,
              status: "failed" as const,
              error: `Campaign, ad set, and creative created, but ad creation failed: ${msg}`,
            };
          }

          // ---- Step 7: Update local records ----
          // Also create a HoneycombCampaign record for unified tracking
          const honeycombCampaign = await prisma.honeycombCampaign.create({
            data: {
              userId: ctx.user_id,
              name: campaignName,
              channel: "meta",
              objective: userObjective.toLowerCase(),
              dailyBudget,
              status: "paused",
              metadata: {
                metaCampaignId: campaignResult.id,
                metaAdSetId: adSetResult.id,
                metaCreativeId: creativeResult.id,
                metaAdId: adResult.id,
                adCopy,
                imageHash,
                targetingCity: userCity,
              },
            },
          });

          await recordChange(ctx.run_id, action.action_id, "MetaCampaign", newCampaign?.id || campaignResult.id, "create", null, {
            metaCampaignId: campaignResult.id,
            metaAdSetId: adSetResult.id,
            metaCreativeId: creativeResult.id,
            metaAdId: adResult.id,
            honeycombCampaignId: honeycombCampaign.id,
            name: campaignName,
            objective,
            dailyBudget,
          });

          const adsManagerUrl = `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${adAccount.adAccountId.replace("act_", "")}`;

          return {
            action_id: action.action_id,
            action_type: action.type,
            status: "success" as const,
            data: {
              channel: "meta",
              campaign_id: campaignResult.id,
              adset_id: adSetResult.id,
              creative_id: creativeResult.id,
              ad_id: adResult.id,
              honeycomb_campaign_id: honeycombCampaign.id,
              name: campaignName,
              objective: userObjective,
              daily_budget: dailyBudget,
              status: "PAUSED",
              ad_copy: adCopy,
              targeting_city: userCity,
              has_image: !!imageHash,
              ads_manager_url: adsManagerUrl,
              listings_count: matchedListings.length,
              listings_matched: matchedListings.slice(0, 5).map(l => ({
                address: l.address,
                city: l.city,
                price: l.price,
                bedrooms: l.bedrooms,
              })),
              note: payload.listing_focus && matchedListings.length > 0
                ? `Your campaign is ready! Promoting ${matchedListings.length} listing${matchedListings.length !== 1 ? "s" : ""} in ${userCity}${payload.target_price_max ? ` under $${payload.target_price_max.toLocaleString()}` : ""}. Budget: $${dailyBudget}/day. Headline: "${adCopy.headline}". It's paused until you approve. Want me to take it live?`
                : `Your campaign is ready! Budget: $${dailyBudget}/day targeting the ${userCity} area. Headline: "${adCopy.headline}". It's paused until you approve. Want me to take it live?`,
            },
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return {
            action_id: action.action_id,
            action_type: action.type,
            status: "failed" as const,
            error: `Failed to create campaign on Facebook: ${message}`,
          };
        }
      }

      case "native": {
        // "native" channel means the user asked generically (e.g. "I need leads").
        // We need an actual ad platform connected to run real ads.
        // Check for Meta account first — if connected, create on Meta instead.
        const nativeMetaAccount = await prisma.metaAdAccount.findFirst({
          where: { userId: ctx.user_id, status: "active" },
        });

        if (!nativeMetaAccount) {
          // No ad platform connected — tell the user to connect one
          return {
            action_id: action.action_id,
            action_type: action.type,
            status: "failed" as const,
            error: "To run Facebook/Instagram ads, you'll need to connect your Meta account first. Go to Settings > Integrations > Connect Facebook. Once connected, I can create and manage your campaigns right from here.",
          };
        }

        if (nativeMetaAccount.tokenExpiresAt && nativeMetaAccount.tokenExpiresAt < new Date()) {
          return {
            action_id: action.action_id,
            action_type: action.type,
            status: "failed" as const,
            error: "Your Facebook connection has expired. Go to Settings > Integrations to reconnect, then I'll set up your campaign.",
          };
        }

        // Meta account is connected — redirect to the "meta" channel logic
        // by re-invoking with channel set to "meta"
        const metaAction = {
          ...action,
          payload: { ...(action.payload as Record<string, unknown>), channel: "meta" },
        } as Action;
        return executors["ads.create_campaign"](metaAction, ctx);
      }

      case "llm": {
        const campaign = await prisma.honeycombCampaign.create({
          data: {
            userId: ctx.user_id,
            name: campaignName,
            channel: "llm",
            objective: payload.objective?.toLowerCase() || "leads",
            dailyBudget,
            status: "active",
          },
        });

        const profile = await prisma.profile.findUnique({
          where: { id: ctx.user_id },
          select: { fullName: true, businessType: true },
        });

        const listing = await prisma.llmListing.create({
          data: {
            campaignId: campaign.id,
            userId: ctx.user_id,
            businessName: payload.business_name || profile?.fullName || "Business",
            category: payload.category || profile?.businessType || "other",
            description: payload.description || "",
            serviceArea: payload.service_area || "",
            phone: payload.phone,
            website: payload.website,
          },
        });

        await recordChange(ctx.run_id, action.action_id, "HoneycombCampaign", campaign.id, "create", null, { campaign, listing });

        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "success" as const,
          data: {
            channel: "llm",
            campaign_id: campaign.id,
            listing_id: listing.id,
            name: campaignName,
            business_name: listing.businessName,
            category: listing.category,
            service_area: listing.serviceArea,
            note: "LLM listing created. Your business will now appear in AI-powered recommendations and chatbot responses for your service area.",
          },
        };
      }

      case "google":
      case "bing": {
        const campaign = await prisma.honeycombCampaign.create({
          data: {
            userId: ctx.user_id,
            name: campaignName,
            channel,
            objective: payload.objective?.toLowerCase() || "leads",
            dailyBudget,
            status: "draft",
            metadata: payload.keywords ? { keywords: payload.keywords } : {},
          },
        });

        await recordChange(ctx.run_id, action.action_id, "HoneycombCampaign", campaign.id, "create", null, campaign);

        const platformName = channel === "google" ? "Google Ads" : "Microsoft Ads";
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "success" as const,
          data: {
            channel,
            campaign_id: campaign.id,
            name: campaignName,
            daily_budget: dailyBudget,
            status: "draft",
            note: `${platformName} integration is coming soon. Your campaign has been saved and will activate when the integration is live.`,
          },
        };
      }

      case "local": {
        const profile = await prisma.profile.findUnique({
          where: { id: ctx.user_id },
          select: { businessType: true },
        });

        const campaign = await prisma.honeycombCampaign.create({
          data: {
            userId: ctx.user_id,
            name: campaignName,
            channel: "local",
            objective: payload.objective?.toLowerCase() || "leads",
            dailyBudget,
            status: "active",
            metadata: {
              serviceArea: payload.service_area || "",
              category: payload.category || profile?.businessType || "other",
            },
          },
        });

        const myCategory = (payload.category || profile?.businessType || "other").toLowerCase().replace(/\s+/g, "_");
        const otherLocalCampaigns = await prisma.honeycombCampaign.findMany({
          where: { channel: "local", status: "active", userId: { not: ctx.user_id } },
          select: { userId: true, metadata: true },
          distinct: ["userId"],
        });

        let matchCount = 0;
        for (const other of otherLocalCampaigns) {
          const otherProfile = await prisma.profile.findUnique({
            where: { id: other.userId },
            select: { businessType: true },
          });
          const otherCategory = (otherProfile?.businessType || "other").toLowerCase().replace(/\s+/g, "_");
          if (otherCategory === myCategory) continue;

          const existing = await prisma.localExchangePair.findFirst({
            where: {
              OR: [
                { userAId: ctx.user_id, userBId: other.userId },
                { userAId: other.userId, userBId: ctx.user_id },
              ],
            },
          });
          if (existing) continue;

          await prisma.localExchangePair.create({
            data: {
              userAId: ctx.user_id,
              userBId: other.userId,
              userACategory: myCategory,
              userBCategory: otherCategory,
              status: "proposed",
            },
          });
          matchCount++;
        }

        await recordChange(ctx.run_id, action.action_id, "HoneycombCampaign", campaign.id, "create", null, campaign);

        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "success" as const,
          data: {
            channel: "local",
            campaign_id: campaign.id,
            name: campaignName,
            matches_found: matchCount,
            note: matchCount > 0
              ? `Local exchange campaign created! Found ${matchCount} potential business partner(s) for cross-promotion. They'll be notified to accept the exchange.`
              : "Local exchange campaign created. We'll match you with non-competing local businesses as they join the network.",
          },
        };
      }

      default:
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "failed" as const,
          error: `Unknown channel: ${channel}. Use: meta, native, llm, google, bing, or local.`,
        };
    }
  },

  "ads.pause_campaign": async (action, ctx) => {
    if (action.type !== "ads.pause_campaign") throw new Error("Invalid action type");

    const payload = action.payload as { campaign_name?: string };

    if (!payload.campaign_name) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "Which campaign should I pause?",
      };
    }

    const adAccount = await prisma.metaAdAccount.findFirst({
      where: { userId: ctx.user_id, status: "active" },
    });

    if (!adAccount) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "No Facebook ad account connected.",
      };
    }

    const campaign = await prisma.metaCampaign.findFirst({
      where: {
        adAccountId: adAccount.id,
        name: { contains: payload.campaign_name, mode: "insensitive" },
        status: { not: "PAUSED" },
      },
    });

    if (!campaign) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Couldn't find an active campaign matching "${payload.campaign_name}".`,
      };
    }

    try {
      const client = createMetaClient(adAccount.accessToken);
      await client.updateCampaignStatus(campaign.metaCampaignId, "PAUSED");

      const before = { ...campaign };
      await prisma.metaCampaign.update({
        where: { id: campaign.id },
        data: { status: "PAUSED" },
      });

      await recordChange(
        ctx.run_id,
        action.action_id,
        "MetaCampaign",
        campaign.id,
        "update",
        before,
        { ...campaign, status: "PAUSED" }
      );

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: {
          campaign_name: campaign.name,
          previous_status: campaign.status,
          new_status: "PAUSED",
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Failed to pause campaign: ${message}`,
      };
    }
  },

  "ads.resume_campaign": async (action, ctx) => {
    if (action.type !== "ads.resume_campaign") throw new Error("Invalid action type");

    const payload = action.payload as { campaign_name?: string };

    if (!payload.campaign_name) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "Which campaign should I resume?",
      };
    }

    const adAccount = await prisma.metaAdAccount.findFirst({
      where: { userId: ctx.user_id, status: "active" },
    });

    if (!adAccount) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "No Facebook ad account connected.",
      };
    }

    const campaign = await prisma.metaCampaign.findFirst({
      where: {
        adAccountId: adAccount.id,
        name: { contains: payload.campaign_name, mode: "insensitive" },
        status: "PAUSED",
      },
    });

    if (!campaign) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Couldn't find a paused campaign matching "${payload.campaign_name}".`,
      };
    }

    try {
      const client = createMetaClient(adAccount.accessToken);
      await client.updateCampaignStatus(campaign.metaCampaignId, "ACTIVE");

      const before = { ...campaign };
      await prisma.metaCampaign.update({
        where: { id: campaign.id },
        data: { status: "ACTIVE" },
      });

      await recordChange(
        ctx.run_id,
        action.action_id,
        "MetaCampaign",
        campaign.id,
        "update",
        before,
        { ...campaign, status: "ACTIVE" }
      );

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: {
          campaign_name: campaign.name,
          previous_status: "PAUSED",
          new_status: "ACTIVE",
          daily_budget: campaign.dailyBudget,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Failed to resume campaign: ${message}`,
      };
    }
  },

  "ads.launch_campaign": async (action, ctx) => {
    if (action.type !== "ads.launch_campaign") throw new Error("Invalid action type");

    const payload = action.payload as { campaign_name: string };

    if (!payload.campaign_name) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "Which campaign should I launch?",
      };
    }

    const adAccount = await prisma.metaAdAccount.findFirst({
      where: { userId: ctx.user_id, status: "active" },
    });

    if (!adAccount) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "No Facebook ad account connected.",
      };
    }

    // Find the campaign by name
    const campaign = await prisma.metaCampaign.findFirst({
      where: {
        adAccountId: adAccount.id,
        name: { contains: payload.campaign_name, mode: "insensitive" },
        status: "PAUSED",
      },
      include: {
        adSets: {
          include: {
            ads: true,
          },
        },
      },
    });

    if (!campaign) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Couldn't find a paused campaign matching "${payload.campaign_name}".`,
      };
    }

    // Verify it has an ad set and ad/creative attached
    const hasAdSet = campaign.adSets.length > 0;
    const hasAd = campaign.adSets.some((adSet) => adSet.ads.length > 0);

    if (!hasAdSet || !hasAd) {
      // Check HoneycombCampaign metadata for meta IDs (may not be synced yet)
      const honeycombCampaign = await prisma.honeycombCampaign.findFirst({
        where: {
          userId: ctx.user_id,
          channel: "meta",
          name: { contains: payload.campaign_name, mode: "insensitive" },
        },
      });
      const metadata = honeycombCampaign?.metadata as Record<string, unknown> | null;
      if (!metadata?.metaAdSetId || !metadata?.metaAdId) {
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "failed" as const,
          error: "This campaign doesn't have a complete ad set and creative. Please create a full campaign first.",
        };
      }
    }

    try {
      const client = createMetaClient(adAccount.accessToken);
      await client.updateCampaignStatus(campaign.metaCampaignId, "ACTIVE");

      const before = { ...campaign, adSets: undefined };
      await prisma.metaCampaign.update({
        where: { id: campaign.id },
        data: { status: "ACTIVE" },
      });

      // Also update the HoneycombCampaign status
      await prisma.honeycombCampaign.updateMany({
        where: {
          userId: ctx.user_id,
          channel: "meta",
          name: { contains: payload.campaign_name, mode: "insensitive" },
          status: "paused",
        },
        data: { status: "active" },
      });

      await recordChange(
        ctx.run_id,
        action.action_id,
        "MetaCampaign",
        campaign.id,
        "update",
        before,
        { ...before, status: "ACTIVE" }
      );

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: {
          campaign_name: campaign.name,
          previous_status: "PAUSED",
          new_status: "ACTIVE",
          daily_budget: campaign.dailyBudget,
          note: `Campaign "${campaign.name}" is now LIVE! It will start delivering ads and spending your budget. You can pause it anytime by saying "pause my campaign".`,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Failed to launch campaign: ${message}`,
      };
    }
  },

  "ads.analyze_performance": async (action, ctx) => {
    if (action.type !== "ads.analyze_performance") throw new Error("Invalid action type");

    const payload = action.payload as { date_range?: "7d" | "14d" | "30d" };
    const dateRange = payload.date_range || "7d";

    // Check for both Meta and Google accounts
    const [metaAccount, googleAccount] = await Promise.all([
      prisma.metaAdAccount.findFirst({
        where: { userId: ctx.user_id, status: "active" },
      }),
      prisma.googleAdAccount.findFirst({
        where: { userId: ctx.user_id, isActive: true },
      }),
    ]);

    if (!metaAccount && !googleAccount) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "No ad accounts connected. Go to Settings to connect a Facebook or Google Ads account.",
      };
    }

    interface CampaignAnalysis {
      campaign_id: string;
      campaign_name: string;
      platform: "meta" | "google";
      status: string;
      spend: number;
      impressions: number;
      clicks: number;
      ctr: number;
      leads: number;
      cost_per_lead: number | null;
      efficiency_score: number | null;
      flags: string[];
    }

    const analyses: CampaignAnalysis[] = [];
    let totalSpend = 0;
    let totalLeads = 0;
    const platformTotals: Record<string, { spend: number; leads: number; impressions: number; clicks: number }> = {};

    const datePresetMap: Record<string, string> = {
      "7d": "last_7d",
      "14d": "last_14d",
      "30d": "last_30d",
    };

    try {
      // ---- META DATA ----
      if (metaAccount) {
        const client = createMetaClient(metaAccount.accessToken);
        const [campaignsRes, insightsRes] = await Promise.all([
          client.getCampaigns(metaAccount.adAccountId),
          client.getInsightsByCampaign(metaAccount.adAccountId, {
            date_preset: datePresetMap[dateRange] as "last_7d" | "last_14d" | "last_30d",
          }),
        ]);

        const campaignMap = new Map(
          campaignsRes.data.map((c) => [c.id, { name: c.name, status: c.status, effective_status: c.effective_status }])
        );

        let metaSpend = 0, metaLeads = 0, metaImpressions = 0, metaClicks = 0;

        for (const insight of insightsRes.data) {
          const campaignId = insight.campaign_id || "";
          const campaign = campaignMap.get(campaignId);
          const spend = parseFloat(insight.spend || "0");
          const impressions = parseInt(insight.impressions || "0", 10);
          const clicks = parseInt(insight.clicks || "0", 10);
          const ctr = parseFloat(insight.ctr || "0");

          let leads = 0;
          if (insight.actions) {
            for (const a of insight.actions) {
              if (
                a.action_type === "lead" ||
                a.action_type === "offsite_conversion.fb_pixel_lead" ||
                a.action_type === "onsite_conversion.lead_grouped"
              ) {
                leads += parseInt(a.value, 10);
              }
            }
          }

          metaSpend += spend;
          metaLeads += leads;
          metaImpressions += impressions;
          metaClicks += clicks;
          totalSpend += spend;
          totalLeads += leads;

          analyses.push({
            campaign_id: campaignId,
            campaign_name: campaign?.name || insight.campaign_name || "Unknown",
            platform: "meta",
            status: campaign?.status || "UNKNOWN",
            spend,
            impressions,
            clicks,
            ctr,
            leads,
            cost_per_lead: leads > 0 ? spend / leads : null,
            efficiency_score: null,
            flags: [],
          });
        }

        platformTotals.meta = { spend: metaSpend, leads: metaLeads, impressions: metaImpressions, clicks: metaClicks };
      }

      // ---- GOOGLE DATA ----
      if (googleAccount) {
        const { GoogleAdsClient } = await import("@/lib/google-ads/client");
        const gClient = new GoogleAdsClient(googleAccount.refreshToken);
        const perfData = await gClient.getCampaignPerformance(googleAccount.customerId, dateRange);

        // Aggregate by campaign (rows are per-day)
        const googleCampaigns = new Map<string, {
          name: string; status: string; spend: number; impressions: number; clicks: number; conversions: number;
        }>();

        for (const row of perfData) {
          const existing = googleCampaigns.get(row.campaignId);
          if (existing) {
            existing.spend += row.costMicros / 1_000_000;
            existing.impressions += row.impressions;
            existing.clicks += row.clicks;
            existing.conversions += row.conversions;
          } else {
            googleCampaigns.set(row.campaignId, {
              name: row.campaignName,
              status: row.status,
              spend: row.costMicros / 1_000_000,
              impressions: row.impressions,
              clicks: row.clicks,
              conversions: row.conversions,
            });
          }
        }

        let googleSpend = 0, googleLeads = 0, googleImpressions = 0, googleClicks = 0;

        for (const [campaignId, data] of googleCampaigns) {
          googleSpend += data.spend;
          googleLeads += data.conversions;
          googleImpressions += data.impressions;
          googleClicks += data.clicks;
          totalSpend += data.spend;
          totalLeads += data.conversions;

          analyses.push({
            campaign_id: campaignId,
            campaign_name: data.name,
            platform: "google",
            status: data.status,
            spend: data.spend,
            impressions: data.impressions,
            clicks: data.clicks,
            ctr: data.impressions > 0 ? data.clicks / data.impressions : 0,
            leads: data.conversions,
            cost_per_lead: data.conversions > 0 ? data.spend / data.conversions : null,
            efficiency_score: null,
            flags: [],
          });
        }

        platformTotals.google = { spend: googleSpend, leads: googleLeads, impressions: googleImpressions, clicks: googleClicks };
      }

      // Calculate account average CPL
      const averageCPL = totalLeads > 0 ? totalSpend / totalLeads : 0;

      // Score and flag each campaign
      let wasteTotal = 0;
      let topPerformer: { name: string; cpl: number; platform: string } | null = null;

      for (const a of analyses) {
        if (a.leads > 0 && a.cost_per_lead !== null && averageCPL > 0) {
          a.efficiency_score = Math.max(0, Math.min(100, Math.round(100 - (a.cost_per_lead / averageCPL * 100) + 100)));
        }

        if (a.spend > 50 && a.leads === 0) {
          a.flags.push("waste");
          wasteTotal += a.spend;
        }

        if (a.cost_per_lead !== null && averageCPL > 0 && a.cost_per_lead > averageCPL * 2) {
          a.flags.push("underperforming");
        }

        if (a.cost_per_lead !== null && (topPerformer === null || a.cost_per_lead < topPerformer.cpl)) {
          topPerformer = { name: a.campaign_name, cpl: a.cost_per_lead, platform: a.platform };
        }
      }

      analyses.sort((a, b) => {
        if (a.efficiency_score === null && b.efficiency_score === null) return 0;
        if (a.efficiency_score === null) return 1;
        if (b.efficiency_score === null) return -1;
        return b.efficiency_score - a.efficiency_score;
      });

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: {
          date_range: dateRange,
          platforms_connected: [
            ...(metaAccount ? ["meta"] : []),
            ...(googleAccount ? ["google"] : []),
          ],
          total_spend: Math.round(totalSpend * 100) / 100,
          total_leads: totalLeads,
          average_cpl: averageCPL > 0 ? Math.round(averageCPL * 100) / 100 : null,
          waste_total: Math.round(wasteTotal * 100) / 100,
          top_performer: topPerformer ? { name: topPerformer.name, cpl: Math.round(topPerformer.cpl * 100) / 100, platform: topPerformer.platform } : null,
          platform_breakdown: platformTotals,
          campaigns: analyses,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Failed to analyze performance: ${message}`,
      };
    }
  },

  "ads.suggest_optimizations": async (action, ctx) => {
    if (action.type !== "ads.suggest_optimizations") throw new Error("Invalid action type");

    const payload = action.payload as { date_range?: "7d" | "14d" | "30d" };
    const dateRange = payload.date_range || "7d";

    // Check for both Meta and Google accounts
    const [metaAccount, googleAccount] = await Promise.all([
      prisma.metaAdAccount.findFirst({
        where: { userId: ctx.user_id, status: "active" },
      }),
      prisma.googleAdAccount.findFirst({
        where: { userId: ctx.user_id, isActive: true },
      }),
    ]);

    if (!metaAccount && !googleAccount) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "No ad accounts connected. Go to Settings to connect a Facebook or Google Ads account.",
      };
    }

    const datePresetMap: Record<string, string> = {
      "7d": "last_7d",
      "14d": "last_14d",
      "30d": "last_30d",
    };

    try {
      let totalSpend = 0;
      let totalLeads = 0;

      const campaignData: Array<{
        name: string;
        platform: "meta" | "google";
        status: string;
        daily_budget: string | null;
        spend: number;
        impressions: number;
        clicks: number;
        leads: number;
        cost_per_lead: number | null;
      }> = [];

      // ---- META DATA ----
      if (metaAccount) {
        const client = createMetaClient(metaAccount.accessToken);
        const [campaignsRes, insightsRes] = await Promise.all([
          client.getCampaigns(metaAccount.adAccountId),
          client.getInsightsByCampaign(metaAccount.adAccountId, {
            date_preset: datePresetMap[dateRange] as "last_7d" | "last_14d" | "last_30d",
          }),
        ]);

        const campaignMap = new Map(
          campaignsRes.data.map((c) => [c.id, { name: c.name, status: c.status, daily_budget: c.daily_budget }])
        );

        for (const insight of insightsRes.data) {
          const campaignId = insight.campaign_id || "";
          const campaign = campaignMap.get(campaignId);
          const spend = parseFloat(insight.spend || "0");
          const impressions = parseInt(insight.impressions || "0", 10);
          const clicks = parseInt(insight.clicks || "0", 10);

          let leads = 0;
          if (insight.actions) {
            for (const a of insight.actions) {
              if (
                a.action_type === "lead" ||
                a.action_type === "offsite_conversion.fb_pixel_lead" ||
                a.action_type === "onsite_conversion.lead_grouped"
              ) {
                leads += parseInt(a.value, 10);
              }
            }
          }

          totalSpend += spend;
          totalLeads += leads;

          campaignData.push({
            name: campaign?.name || insight.campaign_name || "Unknown",
            platform: "meta",
            status: campaign?.status || "UNKNOWN",
            daily_budget: campaign?.daily_budget || null,
            spend,
            impressions,
            clicks,
            leads,
            cost_per_lead: leads > 0 ? Math.round((spend / leads) * 100) / 100 : null,
          });
        }
      }

      // ---- GOOGLE DATA ----
      if (googleAccount) {
        const { GoogleAdsClient } = await import("@/lib/google-ads/client");
        const gClient = new GoogleAdsClient(googleAccount.refreshToken);
        const perfData = await gClient.getCampaignPerformance(googleAccount.customerId, dateRange);

        // Also get campaign list for budget info
        const gCampaigns = await gClient.getCampaigns(googleAccount.customerId);
        const budgetMap = new Map(
          gCampaigns.map((c) => [c.id, c.budgetAmountMicros])
        );

        // Aggregate by campaign (rows are per-day)
        const googleCampaigns = new Map<string, {
          name: string; status: string; spend: number; impressions: number; clicks: number; conversions: number;
        }>();

        for (const row of perfData) {
          const existing = googleCampaigns.get(row.campaignId);
          if (existing) {
            existing.spend += row.costMicros / 1_000_000;
            existing.impressions += row.impressions;
            existing.clicks += row.clicks;
            existing.conversions += row.conversions;
          } else {
            googleCampaigns.set(row.campaignId, {
              name: row.campaignName,
              status: row.status,
              spend: row.costMicros / 1_000_000,
              impressions: row.impressions,
              clicks: row.clicks,
              conversions: row.conversions,
            });
          }
        }

        for (const [campaignId, data] of googleCampaigns) {
          totalSpend += data.spend;
          totalLeads += data.conversions;

          const budgetMicros = budgetMap.get(campaignId);
          const dailyBudget = budgetMicros ? String(parseInt(budgetMicros) / 1_000_000) : null;

          campaignData.push({
            name: data.name,
            platform: "google",
            status: data.status,
            daily_budget: dailyBudget,
            spend: data.spend,
            impressions: data.impressions,
            clicks: data.clicks,
            leads: data.conversions,
            cost_per_lead: data.conversions > 0 ? Math.round((data.spend / data.conversions) * 100) / 100 : null,
          });
        }
      }

      const averageCPL = totalLeads > 0 ? Math.round((totalSpend / totalLeads) * 100) / 100 : 0;

      // Ask Claude for suggestions
      const llm = getDefaultProvider();
      const platformNote = metaAccount && googleAccount
        ? "This business runs ads on BOTH Meta (Facebook/Instagram) and Google Ads. Consider cross-platform budget allocation in your suggestions."
        : "";

      const analysisPrompt = `Campaign performance data (${dateRange} window):
Account average CPL: ${averageCPL > 0 ? `$${averageCPL}` : "N/A (no leads yet)"}
Total spend: $${Math.round(totalSpend * 100) / 100}
Total leads: ${totalLeads}
${platformNote}

Campaigns:
${JSON.stringify(campaignData, null, 2)}`;

      const suggestionsResponse = await llm.complete([
        {
          role: "system",
          content: `You are a senior paid media strategist reviewing ad campaign performance for a small business. Analyze this data and return exactly 3-5 specific, actionable suggestions. Each suggestion should be a JSON object with:
- action: one of 'pause', 'increase_budget', 'decrease_budget', 'keep', 'add_negatives'
- campaign_name: which campaign
- platform: 'meta' or 'google'
- reason: 1 sentence explaining why
- expected_impact: 1 sentence on what this will achieve
- priority: 'high', 'medium', or 'low'

Rules:
- If a campaign has zero leads and spend > $50, ALWAYS suggest pausing it (high priority)
- If a campaign's CPL is 3x+ the average, suggest decreasing budget or pausing
- If a campaign's CPL is below average and has headroom, suggest increasing budget
- If both Meta and Google are present, compare cross-platform CPL and suggest shifting budget from the worse-performing platform to the better one
- Be specific with numbers. Say 'increase budget from $15/day to $25/day', not 'increase budget'
- Return ONLY a JSON array, no other text.`,
        },
        { role: "user", content: analysisPrompt },
      ], { temperature: 0.3 });

      // Parse LLM suggestions
      let suggestions: Array<{
        action: string;
        campaign_name: string;
        platform?: string;
        reason: string;
        expected_impact: string;
        priority: string;
      }> = [];

      try {
        let jsonStr = suggestionsResponse.content.trim();
        if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
        if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
        if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
        jsonStr = jsonStr.trim();
        suggestions = JSON.parse(jsonStr);
      } catch {
        // Fallback: generate basic suggestions programmatically
        for (const c of campaignData) {
          if (c.spend > 50 && c.leads === 0) {
            suggestions.push({
              action: "pause",
              campaign_name: c.name,
              platform: c.platform,
              reason: `Spent $${c.spend} with zero leads in the last ${dateRange}.`,
              expected_impact: `Save $${c.daily_budget ? parseFloat(c.daily_budget) : Math.round(c.spend / 7)}/day in wasted spend.`,
              priority: "high",
            });
          }
        }
      }

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: {
          date_range: dateRange,
          platforms_connected: [
            ...(metaAccount ? ["meta"] : []),
            ...(googleAccount ? ["google"] : []),
          ],
          total_spend: Math.round(totalSpend * 100) / 100,
          total_leads: totalLeads,
          average_cpl: averageCPL > 0 ? averageCPL : null,
          suggestions,
          campaign_count: campaignData.length,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Failed to generate optimization suggestions: ${message}`,
      };
    }
  },

  "ads.apply_optimization": async (action, ctx) => {
    if (action.type !== "ads.apply_optimization") throw new Error("Invalid action type");

    const payload = action.payload as {
      campaign_name: string;
      action: "pause" | "resume" | "increase_budget" | "decrease_budget";
      new_budget?: number;
    };

    if (!payload.campaign_name) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "Campaign name is required.",
      };
    }

    const adAccount = await prisma.metaAdAccount.findFirst({
      where: { userId: ctx.user_id, status: "active" },
    });

    if (!adAccount) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "No Facebook ad account connected.",
      };
    }

    const campaign = await prisma.metaCampaign.findFirst({
      where: {
        adAccountId: adAccount.id,
        name: { contains: payload.campaign_name, mode: "insensitive" },
      },
    });

    if (!campaign) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Couldn't find a campaign matching "${payload.campaign_name}".`,
      };
    }

    const metaClient = createMetaClient(adAccount.accessToken);

    try {
      const before = { ...campaign };

      switch (payload.action) {
        case "pause": {
          await metaClient.updateCampaignStatus(campaign.metaCampaignId, "PAUSED");
          await prisma.metaCampaign.update({
            where: { id: campaign.id },
            data: { status: "PAUSED" },
          });

          await recordChange(ctx.run_id, action.action_id, "MetaCampaign", campaign.id, "update", before, { ...before, status: "PAUSED" });

          return {
            action_id: action.action_id,
            action_type: action.type,
            status: "success" as const,
            data: {
              campaign_name: campaign.name,
              optimization: "pause",
              previous_status: campaign.status,
              new_status: "PAUSED",
              note: `Paused "${campaign.name}" to stop wasted spend.`,
            },
          };
        }

        case "resume": {
          await metaClient.updateCampaignStatus(campaign.metaCampaignId, "ACTIVE");
          await prisma.metaCampaign.update({
            where: { id: campaign.id },
            data: { status: "ACTIVE" },
          });

          await recordChange(ctx.run_id, action.action_id, "MetaCampaign", campaign.id, "update", before, { ...before, status: "ACTIVE" });

          return {
            action_id: action.action_id,
            action_type: action.type,
            status: "success" as const,
            data: {
              campaign_name: campaign.name,
              optimization: "resume",
              previous_status: campaign.status,
              new_status: "ACTIVE",
              note: `Resumed "${campaign.name}".`,
            },
          };
        }

        case "increase_budget":
        case "decrease_budget": {
          if (!payload.new_budget) {
            return {
              action_id: action.action_id,
              action_type: action.type,
              status: "failed" as const,
              error: "new_budget is required for budget changes.",
            };
          }

          // Find the campaign's ad sets
          const adSets = await metaClient.getCampaignAdSets(campaign.metaCampaignId);
          if (adSets.data.length === 0) {
            return {
              action_id: action.action_id,
              action_type: action.type,
              status: "failed" as const,
              error: "Campaign has no ad sets to adjust budget on.",
            };
          }

          const newBudgetCents = Math.round(payload.new_budget * 100);
          const previousBudget = campaign.dailyBudget;

          // Update all ad sets for this campaign
          for (const adSet of adSets.data) {
            await metaClient.updateAdSet(adSet.id, { daily_budget: newBudgetCents });
          }

          // Update local record
          await prisma.metaCampaign.update({
            where: { id: campaign.id },
            data: { dailyBudget: payload.new_budget },
          });

          await recordChange(ctx.run_id, action.action_id, "MetaCampaign", campaign.id, "update", before, { ...before, dailyBudget: payload.new_budget });

          return {
            action_id: action.action_id,
            action_type: action.type,
            status: "success" as const,
            data: {
              campaign_name: campaign.name,
              optimization: payload.action,
              previous_budget: previousBudget,
              new_budget: payload.new_budget,
              ad_sets_updated: adSets.data.length,
              note: `Updated "${campaign.name}" budget from $${previousBudget || "?"}/day to $${payload.new_budget}/day.`,
            },
          };
        }

        default:
          return {
            action_id: action.action_id,
            action_type: action.type,
            status: "failed" as const,
            error: `Unknown optimization action: ${payload.action}`,
          };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Failed to apply optimization: ${message}`,
      };
    }
  },

  // ============================================================================
  // Competitor Research via Ad Library
  // ============================================================================

  "ads.research_competitors": async (action, ctx) => {
    if (action.type !== "ads.research_competitors") throw new Error("Invalid action type");

    try {
      const { createAdLibraryClient } = await import("@/lib/meta/adLibrary");
      const adLibrary = createAdLibraryClient();
      const payload = action.payload;

      const ads = await adLibrary.searchByKeyword(payload.search_term, {
        ad_reached_countries: [payload.country || "US"],
        ad_active_status: payload.active_only ? "ACTIVE" : "ALL",
        limit: payload.limit || 25,
      });

      if (ads.length === 0) {
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "success" as const,
          data: {
            search_term: payload.search_term,
            ads_found: 0,
            analysis: `No ads found for "${payload.search_term}" in the Meta Ad Library. This could mean competitors aren't running Meta ads, or try different search terms.`,
          },
        };
      }

      // Aggregate competitor data
      const competitorMap: Record<string, {
        page_name: string;
        page_id: string;
        ad_count: number;
        platforms: Set<string>;
        sample_headlines: string[];
        sample_bodies: string[];
        estimated_spend_low: number;
        estimated_spend_high: number;
      }> = {};

      for (const ad of ads) {
        const pageId = ad.page_id || "unknown";
        const pageName = ad.page_name || "Unknown Advertiser";

        if (!competitorMap[pageId]) {
          competitorMap[pageId] = {
            page_name: pageName,
            page_id: pageId,
            ad_count: 0,
            platforms: new Set(),
            sample_headlines: [],
            sample_bodies: [],
            estimated_spend_low: 0,
            estimated_spend_high: 0,
          };
        }

        const competitor = competitorMap[pageId];
        competitor.ad_count++;

        if (ad.publisher_platforms) {
          for (const p of ad.publisher_platforms) competitor.platforms.add(p);
        }
        if (ad.ad_creative_link_titles && competitor.sample_headlines.length < 3) {
          competitor.sample_headlines.push(...ad.ad_creative_link_titles.slice(0, 1));
        }
        if (ad.ad_creative_bodies && competitor.sample_bodies.length < 3) {
          competitor.sample_bodies.push(...ad.ad_creative_bodies.slice(0, 1));
        }
        if (ad.spend) {
          competitor.estimated_spend_low += ad.spend.lower_bound || 0;
          competitor.estimated_spend_high += ad.spend.upper_bound || 0;
        }
      }

      // Build competitor summaries
      const competitors = Object.values(competitorMap)
        .sort((a, b) => b.ad_count - a.ad_count)
        .slice(0, 10)
        .map((c) => ({
          page_name: c.page_name,
          page_id: c.page_id,
          active_ads: c.ad_count,
          platforms: Array.from(c.platforms),
          sample_headlines: c.sample_headlines.slice(0, 3),
          sample_bodies: c.sample_bodies.slice(0, 2),
          estimated_spend: c.estimated_spend_high > 0
            ? `$${c.estimated_spend_low} - $${c.estimated_spend_high}`
            : "Unknown",
        }));

      // Use LLM for competitive analysis
      const llm = getDefaultProvider();
      const analysisPrompt = `You are a competitive intelligence analyst for digital advertising. Analyze these competitor ads found in the Meta Ad Library for the search term "${payload.search_term}".

Competitor Data:
${JSON.stringify(competitors, null, 2)}

Provide a concise competitive analysis covering:
1. Key competitors and their ad volume
2. Common messaging themes and angles
3. Platforms being used (Facebook, Instagram, etc.)
4. Spend patterns (if data available)
5. Gaps or opportunities — what angles are competitors NOT using that could work?
6. Actionable recommendations for how to differentiate

Keep it practical and actionable. Format as plain text, not markdown.`;

      const analysisResponse = await llm.complete([
        { role: "system", content: "You are a competitive intelligence analyst for digital advertising. Provide concise, actionable analysis." },
        { role: "user", content: analysisPrompt },
      ]);

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: {
          search_term: payload.search_term,
          country: payload.country || "US",
          ads_found: ads.length,
          unique_advertisers: Object.keys(competitorMap).length,
          top_competitors: competitors,
          analysis: analysisResponse.content,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Competitor research failed: ${message}`,
      };
    }
  },

  "ads.watch_competitor": async (action, ctx) => {
    if (action.type !== "ads.watch_competitor") throw new Error("Invalid action type");

    try {
      const payload = action.payload;

      // Check if already watching this page
      const existing = await prisma.competitorWatch.findUnique({
        where: {
          userId_pageId: {
            userId: ctx.user_id,
            pageId: payload.page_id,
          },
        },
      });

      if (existing) {
        // Reactivate if inactive
        if (!existing.active) {
          await prisma.competitorWatch.update({
            where: { id: existing.id },
            data: { active: true, notes: payload.notes || existing.notes },
          });

          await recordChange(ctx.run_id, action.action_id, "CompetitorWatch", existing.id, "update", { active: false }, { active: true });

          return {
            action_id: action.action_id,
            action_type: action.type,
            status: "success" as const,
            data: {
              watch_id: existing.id,
              page_name: payload.page_name,
              page_id: payload.page_id,
              reactivated: true,
              note: `Reactivated competitor watch for "${payload.page_name}".`,
            },
          };
        }

        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "success" as const,
          data: {
            watch_id: existing.id,
            page_name: payload.page_name,
            page_id: payload.page_id,
            already_watching: true,
            note: `Already watching "${payload.page_name}".`,
          },
        };
      }

      // Do initial search to get current ad count
      let initialAdCount = 0;
      try {
        const { createAdLibraryClient } = await import("@/lib/meta/adLibrary");
        const adLibrary = createAdLibraryClient();
        const ads = await adLibrary.searchByPage(payload.page_id, { ad_active_status: "ACTIVE" });
        initialAdCount = ads.length;
      } catch {
        // Ad library search is optional, don't fail the watch
      }

      // Create the watch record
      const watch = await prisma.competitorWatch.create({
        data: {
          userId: ctx.user_id,
          pageId: payload.page_id,
          pageName: payload.page_name,
          notes: payload.notes,
          lastCheckedAt: new Date(),
          lastAdCount: initialAdCount,
        },
      });

      await recordChange(ctx.run_id, action.action_id, "CompetitorWatch", watch.id, "create", null, watch);

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: {
          watch_id: watch.id,
          page_name: payload.page_name,
          page_id: payload.page_id,
          current_active_ads: initialAdCount,
          note: `Now watching "${payload.page_name}" (${initialAdCount} active ads). You'll be able to track changes in their ad strategy.`,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Failed to set up competitor watch: ${message}`,
      };
    }
  },

  // ============================================================================
  // Google Ads Actions
  // ============================================================================

  "google.analyze_keywords": async (action, ctx) => {
    if (action.type !== "google.analyze_keywords") throw new Error("Invalid action type");

    try {
      const payload = action.payload;
      const dateRange = payload.date_range || "7d";

      const googleAccount = await prisma.googleAdAccount.findFirst({
        where: { userId: ctx.user_id, isActive: true },
      });

      if (!googleAccount) {
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "failed" as const,
          error: "No Google Ads account connected. Go to Settings to connect one.",
        };
      }

      const { createGoogleAdsClient } = await import("@/lib/google-ads/client");
      const client = createGoogleAdsClient(googleAccount.refreshToken);

      const [keywords, campaigns] = await Promise.all([
        client.getKeywordPerformance(googleAccount.customerId, dateRange),
        client.getCampaignPerformance(googleAccount.customerId, dateRange),
      ]);

      // Aggregate campaign-level metrics
      const campaignAgg: Record<string, { name: string; spend: number; clicks: number; impressions: number; conversions: number }> = {};
      for (const row of campaigns) {
        if (!campaignAgg[row.campaignId]) {
          campaignAgg[row.campaignId] = { name: row.campaignName, spend: 0, clicks: 0, impressions: 0, conversions: 0 };
        }
        const c = campaignAgg[row.campaignId];
        c.spend += row.costMicros / 1_000_000;
        c.clicks += row.clicks;
        c.impressions += row.impressions;
        c.conversions += row.conversions;
      }

      // Identify waste keywords (high spend, no conversions)
      const wasteKeywords = keywords
        .filter((k) => k.costMicros > 5_000_000 && k.conversions === 0)
        .sort((a, b) => b.costMicros - a.costMicros)
        .slice(0, 10)
        .map((k) => ({
          keyword: k.keyword,
          match_type: k.matchType,
          spend: `$${(k.costMicros / 1_000_000).toFixed(2)}`,
          clicks: k.clicks,
          conversions: k.conversions,
        }));

      // Top performing keywords
      const topKeywords = keywords
        .filter((k) => k.conversions > 0)
        .sort((a, b) => {
          const aCPConv = a.costMicros / a.conversions;
          const bCPConv = b.costMicros / b.conversions;
          return aCPConv - bCPConv;
        })
        .slice(0, 10)
        .map((k) => ({
          keyword: k.keyword,
          match_type: k.matchType,
          spend: `$${(k.costMicros / 1_000_000).toFixed(2)}`,
          clicks: k.clicks,
          conversions: k.conversions,
          cost_per_conversion: `$${(k.costMicros / k.conversions / 1_000_000).toFixed(2)}`,
        }));

      const totalSpend = Object.values(campaignAgg).reduce((s, c) => s + c.spend, 0);
      const totalConversions = Object.values(campaignAgg).reduce((s, c) => s + c.conversions, 0);

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: {
          platform: "google",
          date_range: dateRange,
          total_spend: Math.round(totalSpend * 100) / 100,
          total_conversions: totalConversions,
          total_keywords_analyzed: keywords.length,
          waste_keywords: wasteKeywords,
          top_keywords: topKeywords,
          campaigns: Object.values(campaignAgg).map((c) => ({
            name: c.name,
            spend: Math.round(c.spend * 100) / 100,
            clicks: c.clicks,
            impressions: c.impressions,
            conversions: c.conversions,
          })),
          suggested_negatives: wasteKeywords.map((k) => k.keyword),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Google keyword analysis failed: ${message}`,
      };
    }
  },

  "google.pause_campaign": async (action, ctx) => {
    if (action.type !== "google.pause_campaign") throw new Error("Invalid action type");

    try {
      const payload = action.payload;

      const googleAccount = await prisma.googleAdAccount.findFirst({
        where: { userId: ctx.user_id, isActive: true },
      });

      if (!googleAccount) {
        return { action_id: action.action_id, action_type: action.type, status: "failed" as const, error: "No Google Ads account connected." };
      }

      const campaign = await prisma.googleCampaign.findFirst({
        where: { accountId: googleAccount.id, name: { contains: payload.campaign_name, mode: "insensitive" }, status: { not: "REMOVED" } },
      });

      if (!campaign) {
        return { action_id: action.action_id, action_type: action.type, status: "failed" as const, error: `No Google campaign found matching "${payload.campaign_name}".` };
      }

      const { createGoogleAdsClient } = await import("@/lib/google-ads/client");
      const client = createGoogleAdsClient(googleAccount.refreshToken);

      const before = { status: campaign.status };
      await client.pauseCampaign(googleAccount.customerId, campaign.campaignId);

      await prisma.googleCampaign.update({ where: { id: campaign.id }, data: { status: "PAUSED" } });
      await recordChange(ctx.run_id, action.action_id, "GoogleCampaign", campaign.id, "update", before, { status: "PAUSED" });

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: { campaign_name: campaign.name, previous_status: before.status, new_status: "PAUSED", note: `Paused Google campaign "${campaign.name}".` },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { action_id: action.action_id, action_type: action.type, status: "failed" as const, error: `Failed to pause Google campaign: ${message}` };
    }
  },

  "google.resume_campaign": async (action, ctx) => {
    if (action.type !== "google.resume_campaign") throw new Error("Invalid action type");

    try {
      const payload = action.payload;

      const googleAccount = await prisma.googleAdAccount.findFirst({
        where: { userId: ctx.user_id, isActive: true },
      });

      if (!googleAccount) {
        return { action_id: action.action_id, action_type: action.type, status: "failed" as const, error: "No Google Ads account connected." };
      }

      const campaign = await prisma.googleCampaign.findFirst({
        where: { accountId: googleAccount.id, name: { contains: payload.campaign_name, mode: "insensitive" }, status: "PAUSED" },
      });

      if (!campaign) {
        return { action_id: action.action_id, action_type: action.type, status: "failed" as const, error: `No paused Google campaign found matching "${payload.campaign_name}".` };
      }

      const { createGoogleAdsClient } = await import("@/lib/google-ads/client");
      const client = createGoogleAdsClient(googleAccount.refreshToken);

      const before = { status: campaign.status };
      await client.resumeCampaign(googleAccount.customerId, campaign.campaignId);

      await prisma.googleCampaign.update({ where: { id: campaign.id }, data: { status: "ENABLED" } });
      await recordChange(ctx.run_id, action.action_id, "GoogleCampaign", campaign.id, "update", before, { status: "ENABLED" });

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: { campaign_name: campaign.name, previous_status: before.status, new_status: "ENABLED", note: `Resumed Google campaign "${campaign.name}".` },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { action_id: action.action_id, action_type: action.type, status: "failed" as const, error: `Failed to resume Google campaign: ${message}` };
    }
  },

  "google.add_negatives": async (action, ctx) => {
    if (action.type !== "google.add_negatives") throw new Error("Invalid action type");

    try {
      const payload = action.payload;

      const googleAccount = await prisma.googleAdAccount.findFirst({
        where: { userId: ctx.user_id, isActive: true },
      });

      if (!googleAccount) {
        return { action_id: action.action_id, action_type: action.type, status: "failed" as const, error: "No Google Ads account connected." };
      }

      const campaign = await prisma.googleCampaign.findFirst({
        where: { accountId: googleAccount.id, name: { contains: payload.campaign_name, mode: "insensitive" }, status: { not: "REMOVED" } },
      });

      if (!campaign) {
        return { action_id: action.action_id, action_type: action.type, status: "failed" as const, error: `No Google campaign found matching "${payload.campaign_name}".` };
      }

      const { createGoogleAdsClient } = await import("@/lib/google-ads/client");
      const client = createGoogleAdsClient(googleAccount.refreshToken);

      const result = await client.addNegativeKeywords(googleAccount.customerId, campaign.campaignId, payload.keywords);

      await recordChange(ctx.run_id, action.action_id, "GoogleCampaign", campaign.id, "update", { negatives_before: "unknown" }, { negatives_added: payload.keywords });

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: {
          campaign_name: campaign.name,
          keywords_added: result.added,
          keywords: payload.keywords,
          note: `Added ${result.added} negative keyword(s) to "${campaign.name}": ${payload.keywords.join(", ")}`,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { action_id: action.action_id, action_type: action.type, status: "failed" as const, error: `Failed to add negative keywords: ${message}` };
    }
  },

  "google.adjust_bid": async (action, ctx) => {
    if (action.type !== "google.adjust_bid") throw new Error("Invalid action type");

    try {
      const payload = action.payload;

      const googleAccount = await prisma.googleAdAccount.findFirst({
        where: { userId: ctx.user_id, isActive: true },
      });

      if (!googleAccount) {
        return { action_id: action.action_id, action_type: action.type, status: "failed" as const, error: "No Google Ads account connected." };
      }

      const campaign = await prisma.googleCampaign.findFirst({
        where: { accountId: googleAccount.id, name: { contains: payload.campaign_name, mode: "insensitive" }, status: { not: "REMOVED" } },
      });

      if (!campaign) {
        return { action_id: action.action_id, action_type: action.type, status: "failed" as const, error: `No Google campaign found matching "${payload.campaign_name}".` };
      }

      const { createGoogleAdsClient } = await import("@/lib/google-ads/client");
      const client = createGoogleAdsClient(googleAccount.refreshToken);

      const newBudgetMicros = Math.round(payload.new_daily_budget * 1_000_000);
      const previousBudgetMicros = campaign.budgetAmountMicros;

      const before = { budgetAmountMicros: previousBudgetMicros };
      await client.updateBudget(googleAccount.customerId, campaign.campaignId, newBudgetMicros);

      await prisma.googleCampaign.update({ where: { id: campaign.id }, data: { budgetAmountMicros: String(newBudgetMicros) } });
      await recordChange(ctx.run_id, action.action_id, "GoogleCampaign", campaign.id, "update", before, { budgetAmountMicros: String(newBudgetMicros) });

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: {
          campaign_name: campaign.name,
          previous_budget: previousBudgetMicros ? `$${(parseInt(previousBudgetMicros) / 1_000_000).toFixed(2)}/day` : "unknown",
          new_budget: `$${payload.new_daily_budget}/day`,
          note: `Updated "${campaign.name}" budget to $${payload.new_daily_budget}/day.`,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { action_id: action.action_id, action_type: action.type, status: "failed" as const, error: `Failed to adjust Google campaign budget: ${message}` };
    }
  },

  // ============================================================================
  // contacts.import — Bulk contact ingestion (CSV, paste, or HubSpot)
  // The actual heavy lifting (CSV parsing, dedup, upsert) is handled by the
  // /api/import/csv API route and the ImportCenter UI component. This executor
  // exists so the LAM runtime can record the intent, surface the approval card,
  // and return a sentinel that instructs the chat UI to open the import panel.
  // ============================================================================
  "contacts.import": async (action, ctx) => {
    if (action.type !== "contacts.import") throw new Error("Invalid action type");

    const { source, raw_csv, dedup_strategy } = action.payload;

    // If raw CSV text was pasted directly into the chat, process it inline.
    if (source === "paste" && raw_csv) {
      try {
        const rows = parseCSVRows(raw_csv);
        if (rows.length === 0) {
          return {
            action_id: action.action_id,
            action_type: action.type,
            status: "failed" as const,
            error: "No rows found in the pasted CSV data.",
          };
        }

        const result = await bulkUpsertContacts(rows, ctx.user_id, dedup_strategy);

        // Log change entries so undo works
        await prisma.lamChangeLog.createMany({
          data: result.created.map((c) => ({
            runId: ctx.run_id,
            actionId: action.action_id,
            entityType: "Contact",
            entityId: c.id,
            operation: "create" as const,
            beforeJson: undefined,
            afterJson: JSON.parse(JSON.stringify(c)),
          })),
        });

        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "success" as const,
          data: {
            imported: result.created.length,
            updated: result.updated.length,
            skipped: result.skipped,
            errors: result.errors,
            // Sentinel for the chat UI to show the import summary card
            __import_complete: true,
          },
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "failed" as const,
          error: `CSV import failed: ${msg}`,
        };
      }
    }

    // For "csv" (file) and "hubspot" sources the UI handles collection and
    // sends rows to /api/import/csv directly. Return a sentinel so the
    // CommandBar / ChatDrawer knows to open the ImportPanel.
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success" as const,
      data: {
        __open_import_panel: true,
        source,
        dedup_strategy,
      },
    };
  },

  // ============================================================================
  // SavedSearch executors
  // ============================================================================

  "savedSearch.create": async (action, ctx) => {
    if (action.type !== "savedSearch.create") throw new Error("Invalid action type");
    const p = action.payload;

    // Resolve contactId from name if needed
    let contactId = p.contactId;
    if (!contactId && p.contactName) {
      const contact = await prisma.contact.findFirst({
        where: { userId: ctx.user_id, name: { contains: p.contactName, mode: "insensitive" } },
        select: { id: true },
      });
      contactId = contact?.id;
    }

    const search = await prisma.savedSearch.create({
      data: {
        userId:        ctx.user_id,
        contactId:     contactId ?? null,
        name:          p.name ?? null,
        priceMin:      p.priceMin ?? null,
        priceMax:      p.priceMax ?? null,
        bedsMin:       p.bedsMin ?? null,
        bathsMin:      p.bathsMin ?? null,
        propertyTypes: p.propertyTypes ?? [],
        neighborhoods: p.neighborhoods ?? [],
        cities:        p.cities ?? [],
        zipCodes:      p.zipCodes ?? [],
        mustHaves:     p.mustHaves ?? [],
        notes:         p.notes ?? null,
      },
    });

    await recordChange(ctx.run_id, action.action_id, "SavedSearch", search.id, "create", null, search);

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: search,
      entity_id: search.id,
      after_state: search,
    };
  },

  "savedSearch.update": async (action, ctx) => {
    if (action.type !== "savedSearch.update") throw new Error("Invalid action type");
    const p = action.payload;

    // Find the search: by id, or by contactName (most recent active)
    let search = p.id
      ? await prisma.savedSearch.findUnique({ where: { id: p.id } })
      : null;

    if (!search && p.contactName) {
      const contact = await prisma.contact.findFirst({
        where: { userId: ctx.user_id, name: { contains: p.contactName, mode: "insensitive" } },
        select: { id: true },
      });
      if (contact) {
        search = await prisma.savedSearch.findFirst({
          where: { userId: ctx.user_id, contactId: contact.id, isActive: true },
          orderBy: { createdAt: "desc" },
        });
      }
    }

    if (!search) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed",
        error: "Saved search not found. Use savedSearch.create to create one first.",
      };
    }

    const before = { ...search };
    const patch = p.patch;
    const updated = await prisma.savedSearch.update({
      where: { id: search.id },
      data: {
        ...(patch.name          !== undefined && { name: patch.name }),
        ...(patch.priceMin      !== undefined && { priceMin: patch.priceMin }),
        ...(patch.priceMax      !== undefined && { priceMax: patch.priceMax }),
        ...(patch.bedsMin       !== undefined && { bedsMin: patch.bedsMin }),
        ...(patch.bathsMin      !== undefined && { bathsMin: patch.bathsMin }),
        ...(patch.propertyTypes !== undefined && { propertyTypes: patch.propertyTypes }),
        ...(patch.neighborhoods !== undefined && { neighborhoods: patch.neighborhoods }),
        ...(patch.cities        !== undefined && { cities: patch.cities }),
        ...(patch.zipCodes      !== undefined && { zipCodes: patch.zipCodes }),
        ...(patch.mustHaves     !== undefined && { mustHaves: patch.mustHaves }),
        ...(patch.notes         !== undefined && { notes: patch.notes }),
        ...(patch.isActive      !== undefined && { isActive: patch.isActive }),
      },
    });

    await recordChange(ctx.run_id, action.action_id, "SavedSearch", updated.id, "update", before, updated);

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: updated,
      entity_id: updated.id,
      before_state: before,
      after_state: updated,
    };
  },

  "savedSearch.list": async (action, ctx) => {
    if (action.type !== "savedSearch.list") throw new Error("Invalid action type");
    const p = action.payload;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { userId: ctx.user_id };

    if (p.active !== undefined) where.isActive = p.active;
    if (p.contactId) {
      where.contactId = p.contactId;
    } else if (p.contactName) {
      const contact = await prisma.contact.findFirst({
        where: { userId: ctx.user_id, name: { contains: p.contactName, mode: "insensitive" } },
        select: { id: true },
      });
      if (contact) where.contactId = contact.id;
    }

    const searches = await prisma.savedSearch.findMany({
      where,
      include: { contact: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: { searches },
    };
  },

  // ============================================================================
  // Deal Milestone executor
  // ============================================================================

  "deal.addMilestones": async (action, ctx) => {
    if (action.type !== "deal.addMilestones") throw new Error("Invalid action type");
    const p = action.payload;

    // Resolve deal
    let dealId = p.dealId;
    if (!dealId && p.dealTitle) {
      const deal = await prisma.deal.findFirst({
        where: { userId: ctx.user_id, title: { contains: p.dealTitle, mode: "insensitive" } },
        select: { id: true },
        orderBy: { createdAt: "desc" },
      });
      dealId = deal?.id;
    }

    // Calculate anchor dates from closingDate when individual dates aren't provided
    const closingDate = p.closingDate ? new Date(p.closingDate) : null;

    function daysBeforeClose(days: number): Date | null {
      if (!closingDate) return null;
      const d = new Date(closingDate);
      d.setDate(d.getDate() - days);
      return d;
    }

    type MilestoneTask = {
      title: string;
      description: string;
      dueDate: Date | null;
      priority: "low" | "medium" | "high";
    };

    let milestones: MilestoneTask[] = [];

    if (p.milestoneType === "buyer_under_contract") {
      milestones = [
        {
          title: "Schedule home inspection",
          description: "Contact inspector and schedule within 5–7 days of acceptance.",
          dueDate: p.inspectionDate ? new Date(p.inspectionDate) : daysBeforeClose(28),
          priority: "high",
        },
        {
          title: "Inspection contingency deadline",
          description: "Review inspection report and submit any repair requests or cancel.",
          dueDate: daysBeforeClose(21),
          priority: "high",
        },
        {
          title: "Order appraisal",
          description: "Confirm lender has ordered the appraisal.",
          dueDate: p.appraisalDate ? new Date(p.appraisalDate) : daysBeforeClose(18),
          priority: "medium",
        },
        {
          title: "Loan contingency deadline",
          description: "Confirm loan approval in writing or request extension.",
          dueDate: p.loanContingencyDate ? new Date(p.loanContingencyDate) : daysBeforeClose(10),
          priority: "high",
        },
        {
          title: "Final walkthrough",
          description: "Walk the property with buyer 1–2 days before closing.",
          dueDate: p.walkThroughDate ? new Date(p.walkThroughDate) : daysBeforeClose(2),
          priority: "medium",
        },
        {
          title: "Closing day",
          description: "Attend closing, collect keys, confirm wire transfer completed.",
          dueDate: closingDate,
          priority: "high",
        },
        {
          title: "Post-close: request review & referral",
          description: "Follow up with buyer 2 weeks after close for a Google review and referral.",
          dueDate: closingDate ? new Date(closingDate.getTime() + 14 * 24 * 60 * 60 * 1000) : null,
          priority: "low",
        },
      ];
    } else if (p.milestoneType === "seller_listing") {
      milestones = [
        {
          title: "Sign listing agreement",
          description: "Get signed listing agreement from seller.",
          dueDate: null,
          priority: "high",
        },
        {
          title: "Order professional photos",
          description: "Schedule photographer for property photos.",
          dueDate: null,
          priority: "high",
        },
        {
          title: "Prepare seller disclosures",
          description: "Complete and send disclosure packet to seller.",
          dueDate: null,
          priority: "high",
        },
        {
          title: "Go live on MLS",
          description: "Upload listing to MLS and all syndication sites.",
          dueDate: null,
          priority: "medium",
        },
        {
          title: "Schedule first open house",
          description: "Plan open house for first or second weekend on market.",
          dueDate: null,
          priority: "medium",
        },
      ];
    } else if (p.milestoneType === "seller_under_contract") {
      milestones = [
        {
          title: "Open escrow",
          description: "Send contract to escrow and confirm earnest money deposit.",
          dueDate: daysBeforeClose(30),
          priority: "high",
        },
        {
          title: "Buyer inspection",
          description: "Coordinate buyer's inspection access.",
          dueDate: p.inspectionDate ? new Date(p.inspectionDate) : daysBeforeClose(25),
          priority: "high",
        },
        {
          title: "Respond to repair requests",
          description: "Review buyer's repair requests and negotiate response.",
          dueDate: daysBeforeClose(20),
          priority: "high",
        },
        {
          title: "Appraisal",
          description: "Ensure appraiser access and review appraisal result.",
          dueDate: p.appraisalDate ? new Date(p.appraisalDate) : daysBeforeClose(14),
          priority: "medium",
        },
        {
          title: "Final walkthrough",
          description: "Coordinate buyer's final walkthrough.",
          dueDate: daysBeforeClose(2),
          priority: "medium",
        },
        {
          title: "Closing day",
          description: "Confirm wire received, keys handed over.",
          dueDate: closingDate,
          priority: "high",
        },
        {
          title: "Post-close: referral follow-up",
          description: "Follow up with seller 2 weeks after close.",
          dueDate: closingDate ? new Date(closingDate.getTime() + 14 * 24 * 60 * 60 * 1000) : null,
          priority: "low",
        },
      ];
    }

    // Create all tasks
    const created = await Promise.all(
      milestones.map((m) =>
        prisma.task.create({
          data: {
            userId:      ctx.user_id,
            title:       m.title,
            description: m.description,
            dueDate:     m.dueDate ?? undefined,
            priority:    m.priority,
            ...(dealId && { dealId }),
          },
        })
      )
    );

    // Move deal to under_contract if applicable
    if (dealId && p.milestoneType === "buyer_under_contract") {
      await prisma.deal.update({
        where: { id: dealId },
        data: {
          stage: "negotiation", // closest stage to "under_contract" in the enum
          ...(closingDate && { expectedCloseDate: closingDate }),
        },
      });
    }

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: {
        tasks_created: created.length,
        deal_id: dealId ?? null,
        milestone_type: p.milestoneType,
        tasks: created.map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate })),
      },
    };
  },

  // ============================================================================
  // Marketing Actions
  // ============================================================================

  "marketing.generate_image": async (action, ctx) => {
    if (action.type !== "marketing.generate_image") throw new Error("Invalid action type");

    const payload = action.payload as {
      type?: string;
      propertyId?: string;
      custom_prompt?: string;
      size?: string;
    };

    if (!process.env.OPENAI_API_KEY) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "Image generation is not configured. Add your OpenAI API key in Settings to enable AI image generation.",
      };
    }

    try {
      const { generateImage, buildAdImagePrompt } = await import("@/lib/image-gen");

      const profile = await prisma.profile.findUnique({
        where: { id: ctx.user_id },
        select: { businessType: true, serviceAreaCity: true },
      });

      let propertyDetails: Record<string, unknown> | undefined;
      if (payload.propertyId) {
        const prop = await prisma.property.findFirst({
          where: { id: payload.propertyId, userId: ctx.user_id },
        });
        if (prop) {
          propertyDetails = {
            address: prop.address,
            bedrooms: prop.bedrooms,
            bathrooms: prop.bathrooms ? Number(prop.bathrooms) : undefined,
            sqft: prop.sqft,
            price: prop.price ? Number(prop.price) : undefined,
          };
        }
      }

      const prompt = payload.custom_prompt || buildAdImagePrompt({
        type: payload.type || "general",
        city: profile?.serviceAreaCity || undefined,
        businessType: profile?.businessType || undefined,
        propertyDetails: propertyDetails as Parameters<typeof buildAdImagePrompt>[0]["propertyDetails"],
      });

      const result = await generateImage({
        prompt,
        size: (payload.size as "1024x1024" | "1792x1024" | "1024x1792") || "1024x1024",
      });

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: {
          image_url: result.url,
          revised_prompt: result.revised_prompt,
          note: "Here's your AI-generated marketing image! You can use this for your ads, social posts, or email campaigns. The image URL is valid for about 1 hour — download it or use it right away.",
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image generation failed";
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Image generation failed: ${message}`,
      };
    }
  },

  "marketing.generate_content": async (action, ctx) => {
    if (action.type !== "marketing.generate_content") throw new Error("Invalid action type");

    const payload = action.payload as {
      type?: string;
      platform?: string;
      propertyId?: string;
      prompt?: string;
    };

    try {
      const profile = await prisma.profile.findUnique({
        where: { id: ctx.user_id },
        select: { fullName: true, businessType: true, serviceAreaCity: true },
      });

      let propertyContext = "";
      if (payload.propertyId) {
        const property = await prisma.property.findFirst({
          where: { id: payload.propertyId, userId: ctx.user_id },
        });
        if (property) {
          propertyContext = `\nProperty: ${property.address || ""}, ${property.city || ""}, ${property.state || ""}. ${property.bedrooms || "?"} bed, ${property.bathrooms || "?"} bath, ${property.sqft || "?"} sqft. Price: $${property.price?.toLocaleString() || "TBD"}.`;
        }
      }

      const platformGuide: Record<string, string> = {
        facebook: "Write for Facebook. Conversational, engaging. 1-3 paragraphs. Include emojis sparingly.",
        instagram: "Write for Instagram. Hook first. Line breaks. 5-10 hashtags at end.",
        linkedin: "Write for LinkedIn. Professional but personable. 2-4 paragraphs.",
        email: "Write an email with subject line, preview text, and body.",
        generic: "Write versatile marketing copy for any channel.",
      };

      const typeGuide: Record<string, string> = {
        new_listing: "Announce a new listing. Highlight key features.",
        open_house: "Promote an open house event with urgency.",
        just_sold: "Celebrate a just-sold property. Build social proof.",
        market_update: "Share local market trends and insights.",
        ad_copy: "Create lead-gen ad copy with strong CTA.",
        general: "Create engaging real estate marketing content.",
      };

      const llm = getDefaultProvider();
      const result = await llm.complete([
        {
          role: "system",
          content: `You are a real estate marketing copywriter.\n\nAgent: ${profile?.fullName || "Agent"}\nBusiness: ${profile?.businessType || "Real estate"}\nArea: ${profile?.serviceAreaCity || "local market"}${propertyContext}\n\n${platformGuide[payload.platform || "generic"] || platformGuide.generic}\n${typeGuide[payload.type || "general"] || typeGuide.general}\n\nRespond with ONLY a JSON object: headline (string), body (string), cta (string), hashtags (string[]).`,
        },
        {
          role: "user",
          content: payload.prompt || `Generate a ${payload.type || "general"} post for ${payload.platform || "social media"}.`,
        },
      ], { temperature: 0.8, maxTokens: 1000 });

      let generated;
      try {
        generated = JSON.parse(result.content);
      } catch {
        generated = { headline: "", body: result.content, cta: "", hashtags: [] };
      }

      const fullContent = [generated.headline, generated.body, generated.cta, generated.hashtags?.join(" ")].filter(Boolean).join("\n\n");

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: {
          ...generated,
          full_content: fullContent,
          note: `Here's your ${payload.type || "marketing"} content for ${payload.platform || "social media"}:\n\n${fullContent}`,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Content generation failed";
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Content generation failed: ${message}`,
      };
    }
  },
};

// ============================================================================
// CSV Parsing Helpers (used by contacts.import executor above)
// ============================================================================

interface ContactRow {
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  type?: string;
  tags?: string[];
  notes?: string;
}

/**
 * Parse a raw CSV string into ContactRow objects.
 * Handles quoted fields, CRLF, and common column name variants.
 */
function parseCSVRows(raw: string): ContactRow[] {
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]).map((h) => h.toLowerCase().trim());

  const colIndex = (variants: string[]): number =>
    variants.reduce((found, v) => (found !== -1 ? found : headers.indexOf(v)), -1);

  const nameCol  = colIndex(["name", "full name", "fullname", "contact name", "first name"]);
  const emailCol = colIndex(["email", "email address", "e-mail"]);
  const phoneCol = colIndex(["phone", "phone number", "mobile", "cell"]);
  const typeCol  = colIndex(["type", "contact type"]);
  const srcCol   = colIndex(["source", "lead source"]);
  const notesCol = colIndex(["notes", "note", "comments"]);
  const tagsCol  = colIndex(["tags", "tag", "labels"]);

  const rows: ContactRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCSVLine(lines[i]);
    const get = (idx: number) => (idx !== -1 ? (cells[idx] ?? "").trim() : "");

    const name = nameCol !== -1 ? get(nameCol) : "";
    if (!name) continue; // skip rows with no name

    const validTypes = ["lead", "client", "agent", "vendor"];
    const rawType = get(typeCol).toLowerCase();

    rows.push({
      name,
      email: get(emailCol) || undefined,
      phone: get(phoneCol) || undefined,
      source: get(srcCol) || undefined,
      type: validTypes.includes(rawType) ? rawType : "lead",
      tags: get(tagsCol) ? get(tagsCol).split(/[,;|]/).map((t) => t.trim()).filter(Boolean) : [],
      notes: get(notesCol) || undefined,
    });
  }
  return rows;
}

/** Minimal RFC-4180 CSV line splitter that handles quoted fields. */
function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      result.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

interface BulkUpsertResult {
  created: Array<{ id: string; name: string }>;
  updated: Array<{ id: string; name: string }>;
  skipped: number;
  errors: number;
}

/**
 * Bulk upsert ContactRows into the database.
 * Dedup strategy:
 *   skip   — if a contact with the same email exists, skip
 *   update — if a contact with the same email exists, merge fields
 *   create — always create (allows duplicates)
 */
async function bulkUpsertContacts(
  rows: ContactRow[],
  userId: string,
  strategy: "skip" | "update" | "create"
): Promise<BulkUpsertResult> {
  const result: BulkUpsertResult = { created: [], updated: [], skipped: 0, errors: 0 };

  for (const row of rows) {
    try {
      if (strategy !== "create" && row.email) {
        const existing = await prisma.contact.findFirst({
          where: { userId, email: row.email },
          select: { id: true, name: true },
        });

        if (existing) {
          if (strategy === "skip") {
            result.skipped++;
            continue;
          }
          // strategy === "update"
          await prisma.contact.update({
            where: { id: existing.id },
            data: {
              name: row.name,
              phone: row.phone ?? undefined,
              source: row.source ?? undefined,
              type: row.type ?? "lead",
              tags: row.tags ?? [],
              notes: row.notes ?? undefined,
            },
          });
          result.updated.push({ id: existing.id, name: row.name });
          continue;
        }
      }

      const created = await prisma.contact.create({
        data: {
          userId,
          name: row.name,
          email: row.email ?? null,
          phone: row.phone ?? null,
          source: row.source ?? null,
          type: row.type ?? "lead",
          tags: row.tags ?? [],
          notes: row.notes ?? null,
        },
        select: { id: true, name: true },
      });
      result.created.push(created);
    } catch {
      result.errors++;
    }
  }

  return result;
}

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

  // If no pending tier-2 actions found, check if there are any actions at all
  if (run.actions.length === 0) {
    const allActions = await prisma.lamAction.findMany({
      where: { runId },
      select: { id: true, actionType: true, status: true, riskTier: true },
    });
    console.error(
      `[LAM] executeApprovedActions: No pending tier-2 actions for run ${runId}. All actions:`,
      JSON.stringify(allActions)
    );
    return {
      run_id: runId,
      status: "completed",
      actions_executed: 0,
      actions_skipped: 0,
      actions_failed: 0,
      actions_pending_approval: 0,
      results: [],
      user_summary: `No pending actions found. Actions in this run: ${allActions.map((a) => `${a.actionType}(${a.status})`).join(", ") || "none"}`,
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

