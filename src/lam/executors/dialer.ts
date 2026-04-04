// Dialer Domain Executors — Task creation, notes, scoring, status, tags, callbacks
import { prisma } from "@/lib/prisma";
import type { ActionExecutor, ActionResult } from "../types";
import type { Action } from "../actionSchema";

/**
 * Helper to extract a string field from the action payload safely.
 */
function payloadStr(action: Action, field: string): string | undefined {
  const raw = action.payload as Record<string, unknown>;
  const val = raw[field];
  return typeof val === "string" ? val : undefined;
}

function payloadNum(action: Action, field: string): number | undefined {
  const raw = action.payload as Record<string, unknown>;
  const val = raw[field];
  return typeof val === "number" ? val : undefined;
}

function payloadArr(action: Action, field: string): string[] | undefined {
  const raw = action.payload as Record<string, unknown>;
  const val = raw[field];
  return Array.isArray(val) ? (val as string[]) : undefined;
}

export const dialerExecutors: Record<string, ActionExecutor> = {
  /**
   * dialer.create_task — Creates a Task record linked to a contact
   */
  "dialer.create_task": async (action, ctx): Promise<ActionResult> => {
    const contactId = payloadStr(action, "contactId");
    const title = payloadStr(action, "title") || "Task from Voice AI";
    const description = payloadStr(action, "description");
    const priority = payloadStr(action, "priority") || "medium";
    const dueDateStr = payloadStr(action, "dueDate");
    const dueDate = dueDateStr ? new Date(dueDateStr) : undefined;

    const task = await prisma.task.create({
      data: {
        userId: ctx.user_id,
        contactId: contactId || undefined,
        title,
        description,
        priority,
        dueDate,
      },
    });

    return {
      action_id: action.action_id,
      action_type: "dialer.create_task",
      status: "success",
      data: task,
      entity_id: task.id,
      after_state: task,
    };
  },

  /**
   * dialer.add_note — Appends a note to the contact's notes field
   */
  "dialer.add_note": async (action, ctx): Promise<ActionResult> => {
    const contactId = payloadStr(action, "contactId");
    const note = payloadStr(action, "note") || payloadStr(action, "description") || "";

    if (!contactId) {
      return {
        action_id: action.action_id,
        action_type: "dialer.add_note",
        status: "failed",
        error: "contactId is required",
      };
    }

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, userId: ctx.user_id },
    });

    if (!contact) {
      return {
        action_id: action.action_id,
        action_type: "dialer.add_note",
        status: "failed",
        error: `Contact ${contactId} not found for user`,
      };
    }

    const existingNotes = contact.notes || "";
    const timestamp = new Date().toLocaleString();
    const updatedNotes = existingNotes
      ? `${existingNotes}\n\n[${timestamp}] ${note}`
      : `[${timestamp}] ${note}`;

    const updated = await prisma.contact.update({
      where: { id: contactId },
      data: { notes: updatedNotes },
    });

    return {
      action_id: action.action_id,
      action_type: "dialer.add_note",
      status: "success",
      data: { notes: updatedNotes },
      entity_id: contactId,
      before_state: { notes: existingNotes },
      after_state: { notes: updated.notes },
    };
  },

  /**
   * dialer.update_score — Updates the contact's lead score
   */
  "dialer.update_score": async (action, ctx): Promise<ActionResult> => {
    const contactId = payloadStr(action, "contactId");
    const score = payloadNum(action, "score");

    if (!contactId) {
      return {
        action_id: action.action_id,
        action_type: "dialer.update_score",
        status: "failed",
        error: "contactId is required",
      };
    }

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, userId: ctx.user_id },
    });

    if (!contact) {
      return {
        action_id: action.action_id,
        action_type: "dialer.update_score",
        status: "failed",
        error: `Contact ${contactId} not found for user`,
      };
    }

    const updated = await prisma.contact.update({
      where: { id: contactId },
      data: { leadScore: score ?? contact.leadScore },
    });

    return {
      action_id: action.action_id,
      action_type: "dialer.update_score",
      status: "success",
      data: { leadScore: updated.leadScore },
      entity_id: contactId,
      before_state: { leadScore: contact.leadScore },
      after_state: { leadScore: updated.leadScore },
    };
  },

  /**
   * dialer.update_status — Updates the contact's type/status field
   */
  "dialer.update_status": async (action, ctx): Promise<ActionResult> => {
    const contactId = payloadStr(action, "contactId");
    const status = payloadStr(action, "status") || "lead";

    if (!contactId) {
      return {
        action_id: action.action_id,
        action_type: "dialer.update_status",
        status: "failed",
        error: "contactId is required",
      };
    }

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, userId: ctx.user_id },
    });

    if (!contact) {
      return {
        action_id: action.action_id,
        action_type: "dialer.update_status",
        status: "failed",
        error: `Contact ${contactId} not found for user`,
      };
    }

    const updated = await prisma.contact.update({
      where: { id: contactId },
      data: { type: status },
    });

    return {
      action_id: action.action_id,
      action_type: "dialer.update_status",
      status: "success",
      data: { type: updated.type },
      entity_id: contactId,
      before_state: { type: contact.type },
      after_state: { type: updated.type },
    };
  },

  /**
   * dialer.add_tag — Adds a tag to the contact's tags array
   */
  "dialer.add_tag": async (action, ctx): Promise<ActionResult> => {
    const contactId = payloadStr(action, "contactId");
    const tag = payloadStr(action, "tag");
    const tags = payloadArr(action, "tags");

    if (!contactId) {
      return {
        action_id: action.action_id,
        action_type: "dialer.add_tag",
        status: "failed",
        error: "contactId is required",
      };
    }

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, userId: ctx.user_id },
    });

    if (!contact) {
      return {
        action_id: action.action_id,
        action_type: "dialer.add_tag",
        status: "failed",
        error: `Contact ${contactId} not found for user`,
      };
    }

    const existingTags = contact.tags || [];
    const newTags = tags || (tag ? [tag] : []);
    const mergedTags = [...new Set([...existingTags, ...newTags])];

    const updated = await prisma.contact.update({
      where: { id: contactId },
      data: { tags: mergedTags },
    });

    return {
      action_id: action.action_id,
      action_type: "dialer.add_tag",
      status: "success",
      data: { tags: updated.tags },
      entity_id: contactId,
      before_state: { tags: existingTags },
      after_state: { tags: updated.tags },
    };
  },

  /**
   * dialer.schedule_callback — Creates a task for a callback at a specific date
   */
  "dialer.schedule_callback": async (action, ctx): Promise<ActionResult> => {
    const contactId = payloadStr(action, "contactId");
    const description = payloadStr(action, "description") || "Scheduled callback from Voice AI";
    const dueDateStr = payloadStr(action, "dueDate");
    const dueDate = dueDateStr ? new Date(dueDateStr) : new Date(Date.now() + 86400000); // default: tomorrow

    const contact = contactId
      ? await prisma.contact.findFirst({
          where: { id: contactId, userId: ctx.user_id },
          select: { id: true, name: true },
        })
      : null;

    const task = await prisma.task.create({
      data: {
        userId: ctx.user_id,
        contactId: contactId || undefined,
        title: `Callback: ${contact?.name || "contact"}`,
        description,
        priority: "high",
        dueDate,
      },
    });

    return {
      action_id: action.action_id,
      action_type: "dialer.schedule_callback",
      status: "success",
      data: task,
      entity_id: task.id,
      after_state: task,
    };
  },
};
