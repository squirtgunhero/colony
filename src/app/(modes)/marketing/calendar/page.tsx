// ============================================
// COLONY - Marketing Content Calendar
// Plan and schedule marketing activities
// ============================================

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { ContentCalendar } from "@/components/marketing/ContentCalendar";

async function getEvents(userId: string) {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setMonth(end.getMonth() + 2);

  return prisma.calendarEvent.findMany({
    where: {
      userId,
      scheduledAt: { gte: start, lt: end },
    },
    orderBy: { scheduledAt: "asc" },
  });
}

export default async function CalendarPage() {
  const userId = await requireUserId();
  const events = await getEvents(userId);

  return <ContentCalendar initialEvents={events} />;
}
