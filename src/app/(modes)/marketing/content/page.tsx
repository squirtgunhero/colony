// ============================================
// COLONY - Marketing Content Hub
// AI content generator + template library
// ============================================

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { ContentHub } from "@/components/marketing/ContentHub";

async function getTemplates(userId: string) {
  return prisma.marketingTemplate.findMany({
    where: {
      OR: [{ userId }, { isSystem: true }],
    },
    orderBy: [{ isSystem: "desc" }, { updatedAt: "desc" }],
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

export default async function ContentPage() {
  const userId = await requireUserId();
  const [templates, properties] = await Promise.all([
    getTemplates(userId),
    getProperties(userId),
  ]);

  return <ContentHub templates={templates} properties={properties} />;
}
