import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { notFound } from "next/navigation";
import { CallListDetail } from "./call-list-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CallListDetailPage({ params }: Props) {
  const userId = await requireUserId();
  const { id } = await params;

  const list = await prisma.callList.findFirst({
    where: { id, userId },
    include: {
      entries: {
        orderBy: { position: "asc" },
      },
    },
  });

  if (!list) notFound();

  const contactIds = list.entries.map((e) => e.contactId);
  const contacts = await prisma.contact.findMany({
    where: { id: { in: contactIds } },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      type: true,
      leadScore: { select: { score: true, grade: true } },
    },
  });

  const contactMap = new Map(contacts.map((c) => [c.id, c]));
  const entries = list.entries.map((entry) => ({
    id: entry.id,
    contactId: entry.contactId,
    position: entry.position,
    status: entry.status,
    outcome: entry.outcome,
    notes: entry.notes,
    calledAt: entry.calledAt?.toISOString() || null,
    contact: contactMap.get(entry.contactId) || null,
  }));

  return (
    <CallListDetail
      list={{
        id: list.id,
        name: list.name,
        description: list.description,
        status: list.status,
      }}
      entries={entries}
    />
  );
}
