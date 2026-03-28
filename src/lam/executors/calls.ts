// ============================================================================
// COLONY LAM - Call Intelligence Executors
// ============================================================================

import { prisma } from "@/lib/prisma";
import type { ActionExecutor } from "../types";

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

export const callExecutors: Record<string, ActionExecutor> = {
  "call.getSummary": async (action, ctx) => {
    const payload = action.payload as {
      contactId?: string;
      contactName?: string;
      callId?: string;
    };

    let recording;

    if (payload.callId) {
      recording = await prisma.callRecording.findUnique({
        where: { id: payload.callId },
        include: { contact: { select: { name: true } } },
      });
    } else {
      const cid = await resolveContactId(payload.contactName, payload.contactId, ctx.user_id);
      if (!cid) {
        return {
          action_id: action.action_id,
          action_type: "call.getSummary",
          status: "failed",
          error: `Contact not found: ${payload.contactName || payload.contactId}`,
        };
      }

      recording = await prisma.callRecording.findFirst({
        where: { contactId: cid, status: "summarized" },
        orderBy: { occurredAt: "desc" },
        include: { contact: { select: { name: true } } },
      });
    }

    if (!recording) {
      return {
        action_id: action.action_id,
        action_type: "call.getSummary",
        status: "success",
        data: { message: "No summarized call recordings found for this contact." },
      };
    }

    return {
      action_id: action.action_id,
      action_type: "call.getSummary",
      status: "success",
      entity_id: recording.id,
      data: {
        contactName: recording.contact?.name,
        summary: recording.summary,
        sentiment: recording.sentiment,
        duration: recording.duration,
        direction: recording.direction,
        occurredAt: recording.occurredAt.toISOString(),
      },
    };
  },

  "call.getActionItems": async (action, ctx) => {
    const payload = action.payload as {
      contactId?: string;
      contactName?: string;
      callId?: string;
    };

    let recording;

    if (payload.callId) {
      recording = await prisma.callRecording.findUnique({
        where: { id: payload.callId },
        include: { contact: { select: { name: true } } },
      });
    } else {
      const cid = await resolveContactId(payload.contactName, payload.contactId, ctx.user_id);
      if (!cid) {
        return {
          action_id: action.action_id,
          action_type: "call.getActionItems",
          status: "failed",
          error: `Contact not found: ${payload.contactName || payload.contactId}`,
        };
      }

      recording = await prisma.callRecording.findFirst({
        where: { contactId: cid, status: "summarized" },
        orderBy: { occurredAt: "desc" },
        include: { contact: { select: { name: true } } },
      });
    }

    if (!recording || !recording.actionItems) {
      return {
        action_id: action.action_id,
        action_type: "call.getActionItems",
        status: "success",
        data: { message: "No action items found.", actionItems: [] },
      };
    }

    return {
      action_id: action.action_id,
      action_type: "call.getActionItems",
      status: "success",
      entity_id: recording.id,
      data: {
        contactName: recording.contact?.name,
        actionItems: recording.actionItems,
        callDate: recording.occurredAt.toISOString(),
      },
    };
  },

  "call.listRecent": async (action, ctx) => {
    const payload = action.payload as {
      contactId?: string;
      contactName?: string;
      limit?: number;
    };

    const limit = payload.limit || 5;

    const where: Record<string, unknown> = { userId: ctx.user_id };

    if (payload.contactId || payload.contactName) {
      const cid = await resolveContactId(payload.contactName, payload.contactId, ctx.user_id);
      if (cid) where.contactId = cid;
    }

    const recordings = await prisma.callRecording.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      take: limit,
      include: { contact: { select: { name: true, email: true } } },
    });

    return {
      action_id: action.action_id,
      action_type: "call.listRecent",
      status: "success",
      data: {
        calls: recordings.map((r) => ({
          id: r.id,
          contactName: r.contact?.name || "Unknown",
          direction: r.direction,
          duration: r.duration,
          status: r.status,
          summary: r.summary,
          sentiment: r.sentiment,
          occurredAt: r.occurredAt.toISOString(),
        })),
        total: recordings.length,
      },
    };
  },
};
