import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { DialerDashboard } from "./dialer-dashboard";

export default async function DialerPage() {
  const userId = await requireUserId();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [callLists, recentCalls, todayAgg] = await Promise.all([
    // Call lists with entry counts
    prisma.callList.findMany({
      where: { userId, status: { not: "archived" } },
      include: {
        _count: { select: { entries: true } },
        entries: {
          where: { status: "completed" },
          select: { id: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),

    // Recent calls (last 20)
    prisma.call.findMany({
      where: { userId },
      include: { contact: { select: { id: true, name: true, phone: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),

    // Today's stats aggregate
    prisma.call.findMany({
      where: { userId, createdAt: { gte: todayStart } },
      select: {
        id: true,
        status: true,
        duration: true,
        isVoiceAI: true,
        appointmentSet: true,
      },
    }),
  ]);

  const formattedLists = callLists.map((list) => ({
    id: list.id,
    name: list.name,
    status: list.status,
    totalEntries: list._count.entries,
    completedEntries: list.entries.length,
  }));

  const formattedCalls = recentCalls.map((call) => ({
    id: call.id,
    status: call.status,
    outcome: call.outcome,
    toNumber: call.toNumber,
    duration: call.duration,
    createdAt: call.createdAt.toISOString(),
    isVoiceAI: call.isVoiceAI,
    aiObjective: call.aiObjective,
    aiSummary: call.aiSummary,
    appointmentSet: call.appointmentSet,
    leadQualified: call.leadQualified,
    contact: call.contact,
  }));

  const todayStats = {
    totalCalls: todayAgg.length,
    connectedCalls: todayAgg.filter((c) => c.status === "completed").length,
    totalDuration: todayAgg.reduce((sum, c) => sum + (c.duration || 0), 0),
    voiceAICalls: todayAgg.filter((c) => c.isVoiceAI).length,
    appointmentsSet: todayAgg.filter((c) => c.appointmentSet).length,
  };

  return (
    <DialerDashboard
      callLists={formattedLists}
      recentCalls={formattedCalls}
      todayStats={todayStats}
    />
  );
}
