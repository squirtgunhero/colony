// ============================================================================
// COLONY LAM - Email Sequence Executors
// ============================================================================

import { prisma } from "@/lib/prisma";
import { enrollContact } from "@/lib/sequences/processor";
import type { ActionExecutor } from "../types";

async function findSequence(id?: string, name?: string) {
  if (id) return prisma.emailSequence.findUnique({ where: { id } });
  if (name) {
    return prisma.emailSequence.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
  }
  return null;
}

async function resolveContactId(
  contactName: string | undefined,
  contactId: string | undefined,
  userId: string
): Promise<string | null> {
  if (contactId) return contactId;
  if (!contactName) return null;
  const contact = await prisma.contact.findFirst({
    where: {
      userId,
      name: { contains: contactName, mode: "insensitive" },
    },
    select: { id: true },
  });
  return contact?.id ?? null;
}

export const sequenceExecutors: Record<string, ActionExecutor> = {
  "sequence.create": async (action, ctx) => {
    const payload = action.payload as {
      name: string;
      description?: string;
      steps: Array<{
        stepNumber: number;
        subject: string;
        bodyTemplate: string;
        delayDays: number;
        sendTime?: string;
      }>;
      status?: string;
    };

    const sequence = await prisma.emailSequence.create({
      data: {
        userId: ctx.user_id,
        name: payload.name,
        description: payload.description,
        steps: payload.steps,
        status: payload.status || "draft",
      },
    });

    return {
      action_id: action.action_id,
      action_type: "sequence.create",
      status: "success",
      entity_id: sequence.id,
      data: {
        id: sequence.id,
        name: sequence.name,
        stepCount: payload.steps.length,
        status: sequence.status,
      },
    };
  },

  "sequence.enroll": async (action, ctx) => {
    const payload = action.payload as {
      sequenceId?: string;
      sequenceName?: string;
      contactId?: string;
      contactName?: string;
      contactNames?: string[];
    };

    const sequence = await findSequence(payload.sequenceId, payload.sequenceName);
    if (!sequence) {
      return {
        action_id: action.action_id,
        action_type: "sequence.enroll",
        status: "failed",
        error: `Sequence not found: ${payload.sequenceName || payload.sequenceId}`,
      };
    }

    if (sequence.status !== "active") {
      return {
        action_id: action.action_id,
        action_type: "sequence.enroll",
        status: "failed",
        error: `Sequence "${sequence.name}" is ${sequence.status}, not active. Activate it first.`,
      };
    }

    // Single or bulk enrollment
    const names = payload.contactNames || (payload.contactName ? [payload.contactName] : []);
    const contactIds: string[] = [];

    if (payload.contactId) {
      contactIds.push(payload.contactId);
    } else {
      for (const name of names) {
        const cid = await resolveContactId(name, undefined, ctx.user_id);
        if (cid) contactIds.push(cid);
      }
    }

    if (contactIds.length === 0) {
      return {
        action_id: action.action_id,
        action_type: "sequence.enroll",
        status: "failed",
        error: "No matching contacts found",
      };
    }

    const results: string[] = [];
    const errors: string[] = [];

    for (const cid of contactIds) {
      try {
        const enrollment = await enrollContact(sequence.id, cid);
        results.push(enrollment.id);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        if (msg.includes("Unique constraint")) {
          errors.push(`Contact already enrolled`);
        } else {
          errors.push(msg);
        }
      }
    }

    return {
      action_id: action.action_id,
      action_type: "sequence.enroll",
      status: results.length > 0 ? "success" : "failed",
      data: {
        enrolled: results.length,
        errors: errors.length > 0 ? errors : undefined,
        sequenceName: sequence.name,
      },
    };
  },

  "sequence.pause": async (action, ctx) => {
    const payload = action.payload as { id?: string; name?: string };
    const sequence = await findSequence(payload.id, payload.name);

    if (!sequence) {
      return {
        action_id: action.action_id,
        action_type: "sequence.pause",
        status: "failed",
        error: `Sequence not found: ${payload.name || payload.id}`,
      };
    }

    await prisma.emailSequence.update({
      where: { id: sequence.id },
      data: { status: "paused" },
    });

    // Pause all active enrollments
    await prisma.sequenceEnrollment.updateMany({
      where: { sequenceId: sequence.id, status: "active" },
      data: { status: "paused" },
    });

    return {
      action_id: action.action_id,
      action_type: "sequence.pause",
      status: "success",
      entity_id: sequence.id,
      data: { name: sequence.name, paused: true },
    };
  },

  "sequence.resume": async (action, ctx) => {
    const payload = action.payload as { id?: string; name?: string };
    const sequence = await findSequence(payload.id, payload.name);

    if (!sequence) {
      return {
        action_id: action.action_id,
        action_type: "sequence.resume",
        status: "failed",
        error: `Sequence not found: ${payload.name || payload.id}`,
      };
    }

    await prisma.emailSequence.update({
      where: { id: sequence.id },
      data: { status: "active" },
    });

    // Resume paused enrollments
    await prisma.sequenceEnrollment.updateMany({
      where: { sequenceId: sequence.id, status: "paused" },
      data: { status: "active" },
    });

    return {
      action_id: action.action_id,
      action_type: "sequence.resume",
      status: "success",
      entity_id: sequence.id,
      data: { name: sequence.name, resumed: true },
    };
  },

  "sequence.getStats": async (action, ctx) => {
    const payload = action.payload as { id?: string; name?: string };
    const sequence = await findSequence(payload.id, payload.name);

    if (!sequence) {
      return {
        action_id: action.action_id,
        action_type: "sequence.getStats",
        status: "failed",
        error: `Sequence not found: ${payload.name || payload.id}`,
      };
    }

    const enrollments = await prisma.sequenceEnrollment.groupBy({
      by: ["status"],
      where: { sequenceId: sequence.id },
      _count: true,
    });

    const events = await prisma.sequenceEvent.groupBy({
      by: ["type"],
      where: { enrollment: { sequenceId: sequence.id } },
      _count: true,
    });

    const statusCounts: Record<string, number> = {};
    let totalEnrolled = 0;
    for (const e of enrollments) {
      statusCounts[e.status] = e._count;
      totalEnrolled += e._count;
    }

    const eventCounts: Record<string, number> = {};
    for (const e of events) {
      eventCounts[e.type] = e._count;
    }

    const sentCount = eventCounts["sent"] || 0;
    const repliedCount = eventCounts["replied"] || 0;
    const bouncedCount = eventCounts["bounced"] || 0;

    return {
      action_id: action.action_id,
      action_type: "sequence.getStats",
      status: "success",
      entity_id: sequence.id,
      data: {
        name: sequence.name,
        sequenceStatus: sequence.status,
        totalEnrolled,
        byStatus: statusCounts,
        emailsSent: sentCount,
        replies: repliedCount,
        bounced: bouncedCount,
        replyRate: sentCount > 0 ? `${((repliedCount / sentCount) * 100).toFixed(1)}%` : "0%",
        bounceRate: sentCount > 0 ? `${((bouncedCount / sentCount) * 100).toFixed(1)}%` : "0%",
      },
    };
  },
};
