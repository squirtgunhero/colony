import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ContactDetailView } from "./contact-detail-view";
import { calculateRelationshipScore } from "@/lib/relationship-score";

interface ContactPageProps {
  params: Promise<{ id: string }>;
}

async function getContact(id: string) {
  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      activities: {
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          deal: true,
          property: true,
        },
      },
      deals: {
        orderBy: { createdAt: "desc" },
        include: {
          property: true,
        },
      },
      properties: {
        orderBy: { createdAt: "desc" },
      },
      tasks: {
        orderBy: [
          { completed: "asc" },
          { dueDate: "asc" },
        ],
      },
    },
  });

  return contact;
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { id } = await params;
  const contact = await getContact(id);

  if (!contact) {
    notFound();
  }

  // Compute relationship score
  const lastActivity = contact.activities[0]?.createdAt ?? null;
  const daysSinceLastActivity = lastActivity
    ? Math.floor(
        (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;
  const hasActiveDeal = contact.deals.some((d) => d.stage !== "closed");
  const hasOverdueTasks = contact.tasks.some(
    (t) => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()
  );

  const relationshipScore = calculateRelationshipScore({
    daysSinceLastActivity,
    totalActivities: contact.activities.length,
    hasActiveDeal,
    hasOverdueTasks,
  });

  const serialized = JSON.parse(JSON.stringify(contact));

  return (
    <ContactDetailView
      contact={serialized}
      relationshipScore={relationshipScore}
      lastContactedDate={lastActivity ? new Date(lastActivity).toISOString() : null}
    />
  );
}
