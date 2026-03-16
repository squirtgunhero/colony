// ============================================
// COLONY - Email Campaign Editor
// Create and edit email campaign content
// ============================================

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";
import { EmailEditor } from "@/components/marketing/EmailEditor";

async function getCampaign(id: string, userId: string) {
  return prisma.emailCampaign.findFirst({
    where: { id, userId },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  });
}

async function getProperties(userId: string) {
  return prisma.property.findMany({
    where: { userId },
    select: { id: true, address: true, city: true, state: true, price: true },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
}

async function getContacts(userId: string) {
  return prisma.contact.findMany({
    where: { userId },
    select: { id: true, name: true, email: true },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
}

export default async function EmailEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireUserId();
  const { id } = await params;
  const [campaign, properties, contacts] = await Promise.all([
    getCampaign(id, userId),
    getProperties(userId),
    getContacts(userId),
  ]);

  if (!campaign) redirect("/marketing/email");

  return (
    <EmailEditor
      campaign={campaign}
      properties={properties}
      contacts={contacts}
    />
  );
}
