// ============================================
// COLONY - Marketing Campaigns
// View and manage ad campaigns across platforms
// ============================================

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { CampaignsListView } from "@/components/marketing/CampaignsListView";

async function getCampaigns(userId: string) {
  // Get Meta ad accounts for this user
  const adAccounts = await prisma.metaAdAccount.findMany({
    where: { userId, status: "active" },
    select: { id: true },
  });

  if (adAccounts.length === 0) {
    return { metaCampaigns: [], hasMetaAccount: false };
  }

  const adAccountIds = adAccounts.map((a) => a.id);

  const metaCampaigns = await prisma.metaCampaign.findMany({
    where: {
      adAccountId: { in: adAccountIds },
      status: { not: "DELETED" },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      adAccount: { select: { adAccountName: true } },
      _count: { select: { adSets: true } },
    },
  });

  return { metaCampaigns, hasMetaAccount: true };
}

export default async function CampaignsPage() {
  const userId = await requireUserId();
  const { metaCampaigns, hasMetaAccount } = await getCampaigns(userId);

  return (
    <CampaignsListView
      metaCampaigns={metaCampaigns}
      hasMetaAccount={hasMetaAccount}
    />
  );
}
