// ============================================
// COLONY - Browse Contacts
// Contacts list in Browse Mode
// ============================================

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { ContactsListView } from "@/components/browse/ContactsListView";

async function getContacts(userId: string) {
  const [contacts, aiValues] = await Promise.all([
    prisma.contact.findMany({
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
        relationshipScore: true,
        avatarUrl: true,
        deals: { take: 1, select: { id: true } },
        properties: { take: 1, select: { id: true, city: true, state: true } },
        leadScore: { select: { score: true, grade: true } },
        _count: {
          select: {
            activities: true,
            tasks: true,
          },
        },
      },
    }),
    // Fetch AI attribute values for all contacts at once
    prisma.aiAttributeValue.findMany({
      where: {
        attribute: { userId, entityType: "contact" },
      },
      select: {
        entityId: true,
        value: true,
        attribute: { select: { name: true, slug: true, outputType: true } },
      },
    }),
  ]);

  // Group AI values by entityId
  const aiByEntity = new Map<string, Array<{ name: string; slug: string; value: string; outputType: string }>>();
  for (const v of aiValues) {
    const list = aiByEntity.get(v.entityId) || [];
    list.push({ name: v.attribute.name, slug: v.attribute.slug, value: v.value, outputType: v.attribute.outputType });
    aiByEntity.set(v.entityId, list);
  }

  return contacts.map((c) => ({
    ...c,
    aiAttributes: aiByEntity.get(c.id) || [],
  }));
}

export default async function BrowseContactsPage() {
  const userId = await requireUserId();
  const contacts = await getContacts(userId);

  return <ContactsListView contacts={contacts} />;
}
