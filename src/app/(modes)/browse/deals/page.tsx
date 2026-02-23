// ============================================
// COLONY - Browse Deals
// Deals list + kanban board in Browse Mode
// ============================================

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { DealsPageClient } from "./deals-page-client";

async function getData(userId: string) {
  const [deals, contacts, properties] = await Promise.all([
    prisma.deal.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        contact: true,
        property: true,
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

  return { deals, contacts, properties };
}

export default async function BrowseDealsPage() {
  const userId = await requireUserId();
  const { deals, contacts, properties } = await getData(userId);

  return (
    <DealsPageClient
      deals={deals}
      contacts={contacts}
      properties={properties}
    />
  );
}
