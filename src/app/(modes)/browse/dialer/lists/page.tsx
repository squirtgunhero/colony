import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { CallListsPage } from "./call-lists-page";

export default async function DialerListsPage() {
  const userId = await requireUserId();

  const [lists, contacts] = await Promise.all([
    prisma.callList.findMany({
      where: { userId, status: { not: "archived" } },
      include: { _count: { select: { entries: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.contact.findMany({
      where: { userId, phone: { not: null } },
      select: {
        id: true,
        name: true,
        phone: true,
        type: true,
        leadScore: { select: { score: true, grade: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const listsWithCounts = await Promise.all(
    lists.map(async (list) => {
      const completed = await prisma.callListEntry.count({
        where: { callListId: list.id, status: "completed" },
      });
      return {
        id: list.id,
        name: list.name,
        description: list.description,
        status: list.status,
        sortOrder: list.sortOrder,
        totalEntries: list._count.entries,
        completedEntries: completed,
        createdAt: list.createdAt.toISOString(),
        updatedAt: list.updatedAt.toISOString(),
      };
    })
  );

  return <CallListsPage lists={listsWithCounts} contacts={contacts} />;
}
