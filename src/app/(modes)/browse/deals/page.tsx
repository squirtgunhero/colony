// ============================================
// COLONY - Browse Deals
// Deals list in Browse Mode
// ============================================

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { DealsListView } from "@/components/browse/DealsListView";

async function getDeals(userId: string) {
  return prisma.deal.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      contact: true,
      property: true,
    },
  });
}

export default async function BrowseDealsPage() {
  const userId = await requireUserId();
  const deals = await getDeals(userId);

  return <DealsListView deals={deals} />;
}
