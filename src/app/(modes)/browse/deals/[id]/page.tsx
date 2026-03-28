import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { DealDetailPage } from "./deal-detail-page";
import { calculateRelationshipScoreLegacy as calculateRelationshipScore } from "@/lib/relationship-score";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BrowseDealPage({ params }: Props) {
  const { id } = await params;
  const userId = await requireUserId();

  const [deal, contacts, properties] = await Promise.all([
    prisma.deal.findFirst({
      where: { id, userId },
      include: {
        contact: true,
        property: true,
        documents: { orderBy: { createdAt: "desc" } },
        tasks: {
          where: { completed: false },
          orderBy: { dueDate: "asc" },
          take: 5,
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { contact: true },
        },
        closingTasks: {
          orderBy: { position: "asc" },
        },
      },
    }),
    prisma.contact.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.property.findMany({
      where: { userId },
      select: { id: true, address: true, city: true },
      orderBy: { address: "asc" },
    }),
  ]);

  if (!deal) notFound();

  // Stage history
  const stageHistory = deal.activities
    .filter((a) => a.type === "deal_update")
    .map((a) => {
      let stage = "";
      try {
        const meta = JSON.parse(a.description || "{}");
        stage = meta.newStage || meta.stage || "";
      } catch {
        stage = a.title.replace("Deal moved to ", "").toLowerCase().replace(/\s/g, "_");
      }
      return { stage, date: a.createdAt.toISOString() };
    })
    .filter((s) => s.stage)
    .reverse();

  if (stageHistory.length === 0 || stageHistory[stageHistory.length - 1]?.stage !== deal.stage) {
    stageHistory.push({ stage: deal.stage, date: deal.updatedAt.toISOString() });
  }

  // Contact relationship score
  let contactScore = null;
  if (deal.contact) {
    const [lastActs, totalCount, overdue] = await Promise.all([
      prisma.activity.findMany({
        where: { contactId: deal.contact.id },
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      }),
      prisma.activity.count({ where: { contactId: deal.contact.id } }),
      prisma.task.count({
        where: { contactId: deal.contact.id, completed: false, dueDate: { lt: new Date() } },
      }),
    ]);
    const lastActivity = lastActs[0]?.createdAt ?? null;
    const daysSince = lastActivity
      ? Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    contactScore = calculateRelationshipScore({
      daysSinceLastActivity: daysSince,
      totalActivities: totalCount,
      hasActiveDeal: true,
      hasOverdueTasks: overdue > 0,
    });
  }

  const serialized = JSON.parse(JSON.stringify(deal));

  return (
    <DealDetailPage
      deal={serialized}
      contacts={contacts}
      properties={properties}
      stageHistory={stageHistory}
      contactScore={contactScore}
    />
  );
}
