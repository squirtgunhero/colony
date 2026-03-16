// ============================================
// COLONY - Email Marketing
// Create and manage email campaigns
// ============================================

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { EmailCampaignsList } from "@/components/marketing/EmailCampaignsList";

async function getEmailCampaigns(userId: string) {
  return prisma.emailCampaign.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { steps: true } },
    },
  });
}

async function getContactCount(userId: string) {
  return prisma.contact.count({ where: { userId } });
}

export default async function EmailPage() {
  const userId = await requireUserId();
  const [campaigns, contactCount] = await Promise.all([
    getEmailCampaigns(userId),
    getContactCount(userId),
  ]);

  return (
    <EmailCampaignsList
      campaigns={campaigns}
      contactCount={contactCount}
    />
  );
}
