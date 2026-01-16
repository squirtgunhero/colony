// ============================================
// COLONY - Browse Contacts
// Contacts list in Browse Mode
// ============================================

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { ContactsListView } from "@/components/browse/ContactsListView";

async function getContacts(userId: string) {
  return prisma.contact.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      deals: { take: 1 },
      properties: { take: 1 },
      _count: {
        select: {
          activities: true,
          tasks: true,
        },
      },
    },
  });
}

export default async function BrowseContactsPage() {
  const userId = await requireUserId();
  const contacts = await getContacts(userId);

  return <ContactsListView contacts={contacts} />;
}
