// ============================================
// COLONY - Browse Contacts
// Contacts list in Browse Mode
// ============================================

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { ContactsListView } from "@/components/browse/ContactsListView";

async function getContacts(userId: string) {
  const contacts = await prisma.contact.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      type: true,
      source: true,
      updatedAt: true,
      deals: { take: 1, select: { id: true } },
      properties: { take: 1, select: { id: true, city: true, state: true } },
      _count: {
        select: {
          activities: true,
          tasks: true,
        },
      },
    },
  });

  return contacts.map((c) => ({
    ...c,
    // Stub fields until schema is extended
    relationshipScore: null as number | null,
    avatarUrl: null as string | null,
    leadScore: null as { score: number; grade: string } | null,
    aiAttributes: [] as Array<{ name: string; slug: string; value: string; outputType: string }>,
  }));
}

export default async function BrowseContactsPage() {
  const userId = await requireUserId();
  const contacts = await getContacts(userId);

  return <ContactsListView contacts={contacts} />;
}
