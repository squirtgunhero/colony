import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { DealDetailView } from "./deal-detail-view";
import { calculateRelationshipScore } from "@/lib/relationship-score";

interface DealPageProps {
  params: Promise<{ id: string }>;
}

async function getDeal(id: string, userId: string) {
  return prisma.deal.findFirst({
    where: { id, userId },
    include: {
      contact: true,
      property: true,
      documents: {
        orderBy: { createdAt: "desc" },
      },
      tasks: {
        where: { completed: false },
        orderBy: { dueDate: "asc" },
        take: 5,
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 15,
        include: {
          contact: true,
        },
      },
    },
  });
}

async function getContacts(userId: string) {
  return prisma.contact.findMany({
    where: { userId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

async function getProperties(userId: string) {
  return prisma.property.findMany({
    where: { userId },
    select: { id: true, address: true, city: true },
    orderBy: { address: "asc" },
  });
}

export default async function DealPage({ params }: DealPageProps) {
  const { id } = await params;
  const userId = await requireUserId();
  const [deal, contacts, properties] = await Promise.all([
    getDeal(id, userId),
    getContacts(userId),
    getProperties(userId),
  ]);

  if (!deal) {
    notFound();
  }

  // Build stage history from deal_update activities
  const stageActivities = deal.activities
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

  // Add current stage if not in history
  if (stageActivities.length === 0 || stageActivities[stageActivities.length - 1]?.stage !== deal.stage) {
    stageActivities.push({ stage: deal.stage, date: deal.updatedAt.toISOString() });
  }

  // Compute contact relationship score if contact exists
  let contactScore = null;
  if (deal.contact) {
    const contactActivities = await prisma.activity.findMany({
      where: { contactId: deal.contact.id },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
    const totalCount = await prisma.activity.count({
      where: { contactId: deal.contact.id },
    });
    const hasOverdueTasks = await prisma.task.count({
      where: {
        contactId: deal.contact.id,
        completed: false,
        dueDate: { lt: new Date() },
      },
    });

    const lastActivity = contactActivities[0]?.createdAt ?? null;
    const daysSince = lastActivity
      ? Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    contactScore = calculateRelationshipScore({
      daysSinceLastActivity: daysSince,
      totalActivities: totalCount,
      hasActiveDeal: true,
      hasOverdueTasks: hasOverdueTasks > 0,
    });
  }

  const serialized = JSON.parse(JSON.stringify(deal));

  return (
    <DealDetailView
      deal={serialized}
      contacts={contacts}
      properties={properties}
      stageHistory={stageActivities}
      contactScore={contactScore}
    />
  );
}
