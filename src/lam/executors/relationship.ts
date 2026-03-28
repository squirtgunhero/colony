// Relationship Intelligence Executors
import { prisma } from "@/lib/prisma";
import type { ActionExecutor } from "../types";
import {
  calculateRelationshipScore,
  getScoreBreakdown,
} from "@/lib/relationship-score";
import { syncEmail } from "@/lib/sync/email-sync";

export const relationshipExecutors: Record<string, ActionExecutor> = {
  "contact.getRelationshipScore": async (action, ctx) => {
    const payload = action.payload as { contactId?: string; contactName?: string };

    let contactId = payload.contactId;
    if (!contactId && payload.contactName) {
      const contact = await prisma.contact.findFirst({
        where: { userId: ctx.user_id, name: { contains: payload.contactName, mode: "insensitive" } },
      });
      if (!contact) {
        return { action_id: action.action_id, action_type: action.type, status: "failed", error: `Contact "${payload.contactName}" not found` };
      }
      contactId = contact.id;
    }

    if (!contactId) {
      return { action_id: action.action_id, action_type: action.type, status: "failed", error: "No contact specified" };
    }

    const breakdown = await getScoreBreakdown(contactId);
    const contact = await prisma.contact.findUnique({ where: { id: contactId }, select: { name: true, email: true } });

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: { contact: contact?.name, email: contact?.email, ...breakdown },
    };
  },

  "contact.getColdContacts": async (action, ctx) => {
    const payload = action.payload as { threshold?: number; limit?: number };
    const threshold = payload.threshold ?? 40;
    const limit = payload.limit ?? 10;

    const contacts = await prisma.contact.findMany({
      where: {
        userId: ctx.user_id,
        relationshipScore: { lt: threshold },
      },
      orderBy: { relationshipScore: "asc" },
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        relationshipScore: true,
        lastExternalContact: true,
        lastContactedAt: true,
        interactionCount: true,
      },
    });

    // Compute days since last contact for each
    const now = Date.now();
    const enriched = contacts.map((c) => {
      const lastDate = c.lastExternalContact || c.lastContactedAt;
      const daysSince = lastDate
        ? Math.floor((now - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24))
        : null;
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        score: c.relationshipScore ?? 0,
        daysSinceContact: daysSince,
        interactionCount: c.interactionCount,
      };
    });

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: { contacts: enriched, count: enriched.length, threshold },
    };
  },

  "contact.getInteractionHistory": async (action, ctx) => {
    const payload = action.payload as { contactId?: string; contactName?: string; limit?: number };
    const limit = payload.limit ?? 20;

    let contactId = payload.contactId;
    if (!contactId && payload.contactName) {
      const contact = await prisma.contact.findFirst({
        where: { userId: ctx.user_id, name: { contains: payload.contactName, mode: "insensitive" } },
      });
      if (!contact) {
        return { action_id: action.action_id, action_type: action.type, status: "failed", error: `Contact "${payload.contactName}" not found` };
      }
      contactId = contact.id;
    }

    if (!contactId) {
      return { action_id: action.action_id, action_type: action.type, status: "failed", error: "No contact specified" };
    }

    const [emails, meetings, contact] = await Promise.all([
      prisma.emailInteraction.findMany({
        where: { contactId },
        orderBy: { occurredAt: "desc" },
        take: limit,
        select: { direction: true, subject: true, snippet: true, occurredAt: true },
      }),
      prisma.meetingInteraction.findMany({
        where: { contactId },
        orderBy: { startTime: "desc" },
        take: limit,
        select: { title: true, startTime: true, endTime: true, status: true },
      }),
      prisma.contact.findUnique({ where: { id: contactId }, select: { name: true } }),
    ]);

    // Merge and sort chronologically
    const timeline = [
      ...emails.map((e) => ({ type: "email" as const, date: e.occurredAt, ...e })),
      ...meetings.map((m) => ({ type: "meeting" as const, date: m.startTime, ...m })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: { contact: contact?.name, interactions: timeline, totalEmails: emails.length, totalMeetings: meetings.length },
    };
  },

  "sync.triggerEmailSync": async (action, ctx) => {
    try {
      const result = await syncEmail(ctx.user_id);
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success",
        data: result,
      };
    } catch (error) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed",
        error: error instanceof Error ? error.message : "Sync failed",
      };
    }
  },

  "sync.getSyncStatus": async (action, ctx) => {
    const [emailSync, calendarSync, emailCount, meetingCount] = await Promise.all([
      prisma.emailSync.findFirst({ where: { profileId: ctx.user_id } }),
      prisma.calendarSync.findFirst({ where: { profileId: ctx.user_id } }),
      prisma.emailInteraction.count({ where: { profileId: ctx.user_id } }),
      prisma.meetingInteraction.count({ where: { profileId: ctx.user_id } }),
    ]);

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: {
        email: {
          lastSyncAt: emailSync?.lastSyncAt,
          status: emailSync?.status ?? "never_synced",
        },
        calendar: {
          lastSyncAt: calendarSync?.lastSyncAt,
          status: calendarSync?.status ?? "never_synced",
        },
        counts: { emails: emailCount, meetings: meetingCount },
      },
    };
  },
};
