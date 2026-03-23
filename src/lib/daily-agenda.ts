/**
 * Daily Agenda Engine
 *
 * Generates a prioritized list of "who to contact today and why"
 * by analyzing relationship decay, unanswered messages, stale deals,
 * dormant contacts, and incomplete profiles.
 */

import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgendaType =
  | "unanswered"
  | "new_lead"
  | "overdue_task"
  | "stale_deal"
  | "decaying"
  | "dormant"
  | "incomplete_profile";

export interface AgendaItem {
  id: string;
  contactId: string;
  contactName: string;
  dealId?: string;
  dealTitle?: string;
  taskId?: string;
  type: AgendaType;
  priority: number; // 0 = highest
  reason: string; // short human-readable text
  suggestedAction: string; // LAM-ready prompt
  score: number; // for ranking within same priority
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STAGE_LABELS: Record<string, string> = {
  new_lead: "New Lead",
  qualified: "Qualified",
  showing: "Showing",
  offer: "Offer",
  negotiation: "Negotiation",
  closed: "Closed",
};

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function generateAgenda(userId: string): Promise<AgendaItem[]> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    unanswered,
    newLeads,
    overdueTasks,
    staleDeals,
    decayingContacts,
    dormantContacts,
    incompleteContacts,
  ] = await Promise.all([
    // P0: Unanswered inbound messages (threads with last inbound > 24h, no outbound reply)
    prisma.$queryRaw<
      { thread_id: string; contact_id: string; contact_name: string; channel: string; hours_ago: number }[]
    >`
      SELECT DISTINCT ON (t.id)
        t.id AS thread_id,
        t.contact_id,
        c.name AS contact_name,
        m.channel,
        EXTRACT(EPOCH FROM NOW() - m.occurred_at)::int / 3600 AS hours_ago
      FROM inbox_threads t
      JOIN inbox_messages m ON m.thread_id = t.id
      JOIN "Contact" c ON c.id = t.contact_id
      WHERE t.status = 'open'
        AND t.contact_id IS NOT NULL
        AND c."user_id" = ${userId}::uuid
        AND m.direction = 'inbound'
        AND m.occurred_at > ${threeDaysAgo}
        AND NOT EXISTS (
          SELECT 1 FROM inbox_messages m2
          WHERE m2.thread_id = t.id
            AND m2.direction = 'outbound'
            AND m2.occurred_at > m.occurred_at
        )
      ORDER BY t.id, m.occurred_at DESC
      LIMIT 5
    `,

    // P1: New leads never contacted
    prisma.contact.findMany({
      where: {
        userId,
        type: "lead",
        lastContactedAt: null,
        createdAt: { lte: threeDaysAgo },
      },
      select: { id: true, name: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),

    // P2: Overdue tasks linked to contacts
    prisma.task.findMany({
      where: {
        userId,
        completed: false,
        dueDate: { lt: now },
        contactId: { not: null },
      },
      include: { contact: { select: { id: true, name: true } } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),

    // P3: Deals going stale (not closed, no update in 10+ days)
    prisma.deal.findMany({
      where: {
        userId,
        stage: { not: "closed" },
        updatedAt: { lt: tenDaysAgo },
      },
      include: { contact: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "asc" },
      take: 5,
    }),

    // P4: Relationship decay — contacted 7-30 days ago, ≥3 activities, has active deal
    prisma.$queryRaw<
      { id: string; name: string; days_since: number; deal_title: string | null; deal_id: string | null }[]
    >`
      SELECT c.id, c.name,
        EXTRACT(DAY FROM NOW() - c."last_contacted_at")::int AS days_since,
        d.title AS deal_title,
        d.id AS deal_id
      FROM "Contact" c
      LEFT JOIN "Deal" d ON d."contactId" = c.id AND d.stage != 'closed'
      WHERE c."user_id" = ${userId}::uuid
        AND c."last_contacted_at" BETWEEN ${thirtyDaysAgo} AND ${sevenDaysAgo}
        AND (
          SELECT COUNT(*) FROM "Activity" a WHERE a."contactId" = c.id
        ) >= 3
        AND d.id IS NOT NULL
      ORDER BY c."last_contacted_at" ASC
      LIMIT 5
    `,

    // P5: Dormant contacts — 30+ days since contact, ≥5 total activities
    prisma.$queryRaw<
      { id: string; name: string; days_since: number; activity_count: number }[]
    >`
      SELECT c.id, c.name,
        EXTRACT(DAY FROM NOW() - c."last_contacted_at")::int AS days_since,
        COUNT(a.id)::int AS activity_count
      FROM "Contact" c
      LEFT JOIN "Activity" a ON a."contactId" = c.id
      WHERE c."user_id" = ${userId}::uuid
        AND c."last_contacted_at" < ${thirtyDaysAgo}
      GROUP BY c.id, c.name, c."last_contacted_at"
      HAVING COUNT(a.id) >= 5
      ORDER BY c."last_contacted_at" ASC
      LIMIT 5
    `,

    // P6: Incomplete profiles — missing email or phone, created > 7 days ago
    prisma.contact.findMany({
      where: {
        userId,
        createdAt: { lt: sevenDaysAgo },
        OR: [{ email: null }, { phone: null }],
      },
      select: { id: true, name: true, email: true, phone: true },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
  ]);

  // -------------------------------------------------------------------------
  // Transform into AgendaItems
  // -------------------------------------------------------------------------

  const items: AgendaItem[] = [];

  for (const row of unanswered) {
    const hoursText = row.hours_ago < 24 ? `${row.hours_ago}h ago` : `${Math.floor(row.hours_ago / 24)}d ago`;
    items.push({
      id: `unanswered-${row.thread_id}`,
      contactId: row.contact_id,
      contactName: row.contact_name,
      type: "unanswered",
      priority: 0,
      reason: `Sent you ${row.channel === "email" ? "an email" : `a ${row.channel}`} ${hoursText} — reply?`,
      suggestedAction: `Draft a reply to ${row.contact_name}`,
      score: row.hours_ago, // older = higher urgency
    });
  }

  for (const lead of newLeads) {
    const daysOld = Math.floor((now.getTime() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    items.push({
      id: `new-lead-${lead.id}`,
      contactId: lead.id,
      contactName: lead.name,
      type: "new_lead",
      priority: 1,
      reason: `New lead — hasn't been contacted yet (${daysOld}d)`,
      suggestedAction: `Send an intro message to ${lead.name}`,
      score: daysOld,
    });
  }

  for (const task of overdueTasks) {
    if (!task.contact) continue;
    const daysOverdue = Math.floor((now.getTime() - (task.dueDate?.getTime() ?? now.getTime())) / (1000 * 60 * 60 * 24));
    items.push({
      id: `overdue-${task.id}`,
      contactId: task.contact.id,
      contactName: task.contact.name,
      taskId: task.id,
      type: "overdue_task",
      priority: 2,
      reason: `Follow-up overdue by ${daysOverdue}d`,
      suggestedAction: `Follow up with ${task.contact.name} about "${task.title}"`,
      score: daysOverdue,
    });
  }

  for (const deal of staleDeals) {
    if (!deal.contact) continue;
    const daysStaleDeal = Math.floor((now.getTime() - deal.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
    items.push({
      id: `stale-deal-${deal.id}`,
      contactId: deal.contact.id,
      contactName: deal.contact.name,
      dealId: deal.id,
      dealTitle: deal.title,
      type: "stale_deal",
      priority: 3,
      reason: `Deal stuck in ${STAGE_LABELS[deal.stage] ?? deal.stage} for ${daysStaleDeal}d`,
      suggestedAction: `Check in with ${deal.contact.name} about "${deal.title}"`,
      score: daysStaleDeal,
    });
  }

  for (const c of decayingContacts) {
    items.push({
      id: `decaying-${c.id}`,
      contactId: c.id,
      contactName: c.name,
      dealId: c.deal_id ?? undefined,
      dealTitle: c.deal_title ?? undefined,
      type: "decaying",
      priority: 4,
      reason: `Going cold — last contact ${c.days_since}d ago`,
      suggestedAction: `Send a check-in to ${c.name}`,
      score: c.days_since,
    });
  }

  for (const c of dormantContacts) {
    items.push({
      id: `dormant-${c.id}`,
      contactId: c.id,
      contactName: c.name,
      type: "dormant",
      priority: 5,
      reason: `Haven't talked in ${c.days_since}d — time to reconnect?`,
      suggestedAction: `Reconnect with ${c.name}`,
      score: c.activity_count, // more past activity = higher value
    });
  }

  for (const c of incompleteContacts) {
    const missing = !c.email ? "email" : "phone";
    items.push({
      id: `incomplete-${c.id}`,
      contactId: c.id,
      contactName: c.name,
      type: "incomplete_profile",
      priority: 6,
      reason: `Missing ${missing} — update their info?`,
      suggestedAction: `Update contact info for ${c.name}`,
      score: 0,
    });
  }

  // -------------------------------------------------------------------------
  // Deduplicate by contactId (keep highest priority / lowest number)
  // -------------------------------------------------------------------------

  const seen = new Map<string, AgendaItem>();
  for (const item of items) {
    const existing = seen.get(item.contactId);
    if (!existing || item.priority < existing.priority) {
      seen.set(item.contactId, item);
    }
  }

  const deduped = Array.from(seen.values());

  // Sort by priority asc, then score desc within same priority
  deduped.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.score - a.score;
  });

  return deduped.slice(0, 10);
}

// ---------------------------------------------------------------------------
// Helper: update lastContactedAt denormalization
// ---------------------------------------------------------------------------

export async function updateContactTimestamp(contactId: string): Promise<void> {
  await prisma.contact.update({
    where: { id: contactId },
    data: { lastContactedAt: new Date() },
  });
}
