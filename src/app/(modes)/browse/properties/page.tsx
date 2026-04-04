// ============================================
// COLONY - Browse Properties
// Properties list in Browse Mode
// ============================================

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { PropertiesPage } from "./properties-page";

async function getProperties(userId: string) {
  return prisma.property.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      owner: true,
      _count: {
        select: {
          deals: true,
        },
      },
    },
  });
}

export default async function BrowsePropertiesPage() {
  const userId = await requireUserId();
  const properties = await getProperties(userId);

  return <PropertiesPage properties={properties} />;
}
