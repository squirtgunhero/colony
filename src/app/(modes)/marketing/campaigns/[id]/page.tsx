// ============================================
// COLONY - Campaign Detail Page
// View individual campaign performance and ad sets
// ============================================

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { notFound } from "next/navigation";
import { CampaignDetailView } from "@/components/marketing/CampaignDetailView";

async function getCampaign(campaignId: string, userId: string) {
  const campaign = await prisma.metaCampaign.findUnique({
    where: { id: campaignId },
    include: {
      adAccount: {
        select: { adAccountName: true, userId: true },
      },
      adSets: {
        orderBy: { updatedAt: "desc" },
        include: {
          ads: {
            orderBy: { updatedAt: "desc" },
            select: {
              id: true,
              name: true,
              status: true,
              effectiveStatus: true,
              previewUrl: true,
            },
          },
        },
      },
    },
  });

  if (!campaign || campaign.adAccount.userId !== userId) {
    return null;
  }

  return campaign;
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireUserId();
  const { id } = await params;
  const campaign = await getCampaign(id, userId);

  if (!campaign) notFound();

  return <CampaignDetailView campaign={campaign} />;
}
