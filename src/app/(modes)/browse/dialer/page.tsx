import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { DialerDashboard } from "./dialer-dashboard";

export default async function DialerPage() {
  const userId = await requireUserId();

  const [callLists, recentCalls, todayStats] = await Promise.all([
    prisma.callList.findMany({
      where: { userId, status: { in: ["active", "paused"] } },
      include: {
        _count: { select: { entries: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.call.findMany({
      where: { userId },
      include: { contact: { select: { id: true, name: true, phone: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    (async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [totalCalls, connectedCalls, totalDuration] = await Promise.all([
        prisma.call.count({ where: { userId, createdAt: { gte: today } } }),
        prisma.call.count({ where: { userId, createdAt: { gte: today }, status: "completed", outcome: "connected" } }),
        prisma.call.aggregate({ where: { userId, createdAt: { gte: today } }, _sum: { duration: true } }),
      ]);
      return {
        totalCalls,
        connectedCalls,
        totalDuration: totalDuration._sum.duration || 0,
      };
    })(),
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
      recentCalls={recentCalls.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))}
      todayStats={todayStats}
    />
  );
}
