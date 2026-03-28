import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ContactDetailView } from "./contact-detail-view";
import { getScoreBreakdown } from "@/lib/relationship-score";
import { requireUser } from "@/lib/supabase/auth";

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
      emailInteractions: {
        orderBy: { occurredAt: "desc" },
        take: 50,
      },
      meetingInteractions: {
        orderBy: { startTime: "desc" },
        take: 50,
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

  // Use the new weighted score algorithm
  const scoreBreakdown = await getScoreBreakdown(id);

  const relationshipScore = {
    score: scoreBreakdown.total,
    label: scoreBreakdown.label,
    color: scoreBreakdown.color,
  };

  // Determine last contacted date from all sources
  const candidates: Date[] = [];
  if (contact.activities[0]?.createdAt) candidates.push(new Date(contact.activities[0].createdAt));
  if (contact.emailInteractions[0]?.occurredAt) candidates.push(new Date(contact.emailInteractions[0].occurredAt));
  if (contact.meetingInteractions[0]?.startTime) candidates.push(new Date(contact.meetingInteractions[0].startTime));
  if (contact.lastContactedAt) candidates.push(new Date(contact.lastContactedAt));

  const lastContactedDate = candidates.length > 0
    ? new Date(Math.max(...candidates.map((d) => d.getTime()))).toISOString()
    : null;

  // Fetch AI attribute values for this contact
  const aiAttributeValues = await prisma.aiAttributeValue.findMany({
    where: { entityId: id },
    include: { attribute: { select: { name: true, slug: true, outputType: true, options: true } } },
    orderBy: { computedAt: "desc" },
  });

  const aiAttributes = aiAttributeValues.map((v) => ({
    name: v.attribute.name,
    slug: v.attribute.slug,
    value: v.value,
    confidence: v.confidence,
    outputType: v.attribute.outputType,
    options: v.attribute.options as string[] | null,
    computedAt: v.computedAt.toISOString(),
  }));

  // Get current user for presence
  const currentUser = await requireUser();
  const currentUserMeta = {
    name: currentUser.user_metadata?.full_name || currentUser.email || "You",
    avatar: currentUser.user_metadata?.avatar_url || null,
  };

  const serialized = JSON.parse(JSON.stringify(contact));

  return (
    <ContactDetailView
      contact={serialized}
      relationshipScore={relationshipScore}
      lastContactedDate={lastContactedDate}
      aiAttributes={aiAttributes}
      currentUser={currentUserMeta}
    />
  );
}
