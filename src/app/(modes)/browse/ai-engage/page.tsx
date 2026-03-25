import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { AIEngageDashboard } from "./ai-engage-dashboard";

export default async function AIEngagePage() {
  const userId = await requireUserId();

  const [engagements, stats] = await Promise.all([
    prisma.aIEngagement.findMany({
      where: { userId },
      include: {
        contact: { select: { id: true, name: true, email: true, phone: true, source: true, type: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    }),
    (async () => {
      const [active, qualified, converted, unresponsive, totalMessages] = await Promise.all([
        prisma.aIEngagement.count({ where: { userId, status: "active" } }),
        prisma.aIEngagement.count({ where: { userId, status: "qualified" } }),
        prisma.aIEngagement.count({ where: { userId, status: "converted" } }),
        prisma.aIEngagement.count({ where: { userId, status: "unresponsive" } }),
        prisma.aIEngagementMessage.count({
          where: { engagement: { userId } },
        }),
      ]);
      return { active, qualified, converted, unresponsive, totalMessages };
    })(),
  ]);

  const serialized = JSON.parse(JSON.stringify(engagements));

  return <AIEngageDashboard engagements={serialized} stats={stats} />;
}
