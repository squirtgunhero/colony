import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { DialerDashboard } from "./dialer-dashboard";

export default async function DialerPage() {
  const userId = await requireUserId();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [callLists, recentCalls, totalCalls, connectedCalls, totalDuration, voiceAICalls, appointmentsSet] =
    await Promise.all([
      prisma.callList.findMany({
        where: { userId, status: { in: ["active", "paused"] } },
        include: { _count: { select: { entries: true } } },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      prisma.call.findMany({
        where: { userId },
        include: { contact: { select: { id: true, name: true, phone: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.call.count({ where: { userId, createdAt: { gte: today } } }),
      prisma.call.count({
        where: { userId, createdAt: { gte: today }, status: "completed", outcome: "connected" },
      }),
      prisma.call.aggregate({
        where: { userId, createdAt: { gte: today } },
        _sum: { duration: true },
      }),
      prisma.call.count({
        where: { userId, createdAt: { gte: today }, isVoiceAI: true },
      }),
      prisma.call.count({
        where: { userId, createdAt: { gte: today }, appointmentSet: true },
      }),
    ]);

  const listsWithProgress = await Promise.all(
    callLists.map(async (list) => {
      const completed = await prisma.callListEntry.count({
        where: { callListId: list.id, status: "completed" },
      });
      return {
        ...list,
        totalEntries: list._count.entries,
        completedEntries: completed,
      };
    })
  );

  return (
    <DialerDashboard
      callLists={listsWithProgress}
      recentCalls={recentCalls.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        isVoiceAI: c.isVoiceAI,
        aiObjective: c.aiObjective,
        appointmentSet: c.appointmentSet,
        leadQualified: c.leadQualified,
      }))}
      todayStats={{
        totalCalls,
        connectedCalls,
        totalDuration: totalDuration._sum.duration || 0,
        voiceAICalls,
        appointmentsSet,
      }}
    />
  );
}
