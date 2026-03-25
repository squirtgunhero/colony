// ============================================
// COLONY - Browse Companies
// Companies list in Browse Mode
// ============================================

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { CompaniesListView } from "@/components/browse/CompaniesListView";

async function getCompanies(userId: string) {
  return prisma.company.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          contacts: true,
          deals: true,
        },
      },
    },
  });
}

export default async function BrowseCompaniesPage() {
  const userId = await requireUserId();
  const companies = await getCompanies(userId);

  return <CompaniesListView companies={companies} />;
}
