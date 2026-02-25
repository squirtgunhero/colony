import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;

  const contactCount = await prisma.contact.count({ where: { userId } });
  const isNewUser = contactCount === 0;

  if (isNewUser) {
    return NextResponse.json({ suggestions: [], isNewUser: true });
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [staleContacts, staleDealsList, overdueTasks, thisWeekTasks] =
    await Promise.all([
      // Contacts whose most recent activity is older than 7 days
      prisma.$queryRaw<{ id: string; name: string; days_ago: number }[]>`
        SELECT c.id, c.name,
          EXTRACT(DAY FROM NOW() - MAX(a."createdAt"))::int AS days_ago
        FROM "Contact" c
        LEFT JOIN "Activity" a ON a."contactId" = c.id
        WHERE c."user_id" = ${userId}::uuid
        GROUP BY c.id, c.name
        HAVING MAX(a."createdAt") < ${sevenDaysAgo} OR MAX(a."createdAt") IS NULL
        ORDER BY MAX(a."createdAt") ASC NULLS FIRST
        LIMIT 3
      `,

      // Deals stuck in a stage for 14+ days
      prisma.deal.findMany({
        where: {
          userId,
          stage: { notIn: ["closed"] },
          updatedAt: { lt: fourteenDaysAgo },
        },
        include: { contact: { select: { name: true } } },
        orderBy: { updatedAt: "asc" },
        take: 3,
      }),

      // Overdue tasks
      prisma.task.findMany({
        where: {
          userId,
          completed: false,
          dueDate: { lt: now },
        },
        include: { contact: { select: { name: true } } },
        orderBy: { dueDate: "asc" },
        take: 3,
      }),

      // Tasks scheduled this week
      prisma.task.count({
        where: {
          userId,
          completed: false,
          dueDate: {
            gte: now,
            lt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

  const suggestions: {
    id: string;
    type: string;
    text: string;
    action: string;
  }[] = [];

  // Priority 1: Overdue tasks
  if (overdueTasks.length > 0) {
    const t = overdueTasks[0];
    const contactNote = t.contact ? ` for ${t.contact.name}` : "";
    suggestions.push({
      id: `overdue-${t.id}`,
      type: "overdue_task",
      text: `"${t.title}"${contactNote} is overdue. Want me to reschedule it?`,
      action: `Show my overdue tasks`,
    });
  }

  // Priority 2: Stale contacts needing follow-up
  if (staleContacts.length > 0 && suggestions.length < 3) {
    const c = staleContacts[0];
    const daysText =
      c.days_ago != null ? `${c.days_ago} days` : "a while";
    suggestions.push({
      id: `followup-${c.id}`,
      type: "follow_up",
      text: `${c.name} hasn't been contacted in ${daysText}. Want me to send a check-in?`,
      action: `Draft a follow-up message for ${c.name}`,
    });
  }

  // Priority 3: Stale deals
  if (staleDealsList.length > 0 && suggestions.length < 3) {
    const d = staleDealsList[0];
    const daysDiff = Math.floor(
      (now.getTime() - new Date(d.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    const weekCount = Math.floor(daysDiff / 7);
    const timeText = weekCount > 1 ? `${weekCount} weeks` : `${daysDiff} days`;
    const stageLabel = STAGE_LABELS[d.stage] ?? d.stage;
    suggestions.push({
      id: `deal-${d.id}`,
      type: "stale_deal",
      text: `Your deal "${d.title}" has been in ${stageLabel} for ${timeText}. Time to move it forward?`,
      action: `Show me the deal "${d.title}"`,
    });
  }

  // Priority 4: Empty calendar
  if (thisWeekTasks === 0 && suggestions.length < 3) {
    suggestions.push({
      id: "empty-calendar",
      type: "empty_calendar",
      text: "You have no tasks scheduled this week. Want me to create follow-ups for your active leads?",
      action: "Create follow-up tasks for my active leads",
    });
  }

  // Fill remaining spots with additional stale contacts (skip similar names)
  if (staleContacts.length > 1 && suggestions.length < 3) {
    const usedNames = new Set(
      suggestions
        .filter((s) => s.type === "follow_up")
        .map((s) => s.text.split(" hasn't")[0].toLowerCase().trim())
    );

    for (let i = 1; i < staleContacts.length && suggestions.length < 3; i++) {
      const c = staleContacts[i];
      const nameLower = c.name.toLowerCase().trim();
      const isDuplicate = Array.from(usedNames).some(
        (used) =>
          used === nameLower ||
          used.includes(nameLower) ||
          nameLower.includes(used)
      );
      if (isDuplicate) continue;

      const daysText = c.days_ago != null ? `${c.days_ago} days` : "a while";
      suggestions.push({
        id: `followup-${c.id}`,
        type: "follow_up",
        text: `${c.name} hasn't been contacted in ${daysText}. Want me to send a check-in?`,
        action: `Draft a follow-up message for ${c.name}`,
      });
      usedNames.add(nameLower);
    }
  }

  return NextResponse.json({
    suggestions: suggestions.slice(0, 3),
    isNewUser: false,
  });
}

const STAGE_LABELS: Record<string, string> = {
  new_lead: "New Lead",
  qualified: "Qualified",
  showing: "Showing",
  offer: "Offer",
  negotiation: "Negotiation",
  closed: "Closed",
};
