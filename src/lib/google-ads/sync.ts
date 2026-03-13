// ============================================
// GOOGLE ADS SYNC SERVICE
// Sync campaigns from Google Ads API
// ============================================

import { prisma } from "@/lib/prisma";
import { createGoogleAdsClient } from "./client";

export interface GoogleSyncResult {
  success: boolean;
  syncedAt: Date;
  counts: { campaigns: number };
  errors?: string[];
}

/**
 * Sync all campaigns for a connected Google Ad account
 */
export async function syncGoogleAdAccount(
  accountDbId: string
): Promise<GoogleSyncResult> {
  const errors: string[] = [];
  const counts = { campaigns: 0 };

  try {
    const account = await prisma.googleAdAccount.findUnique({
      where: { id: accountDbId },
    });

    if (!account) {
      throw new Error("Google Ad account not found");
    }

    if (!account.refreshToken) {
      throw new Error("No refresh token for Google Ad account");
    }

    const client = createGoogleAdsClient(account.refreshToken);

    // Sync campaigns
    try {
      const campaigns = await client.getCampaigns(account.customerId);

      for (const campaign of campaigns) {
        await prisma.googleCampaign.upsert({
          where: {
            accountId_campaignId: {
              accountId: accountDbId,
              campaignId: campaign.id,
            },
          },
          create: {
            accountId: accountDbId,
            campaignId: campaign.id,
            name: campaign.name,
            status: campaign.status,
            budgetAmountMicros: campaign.budgetAmountMicros,
            startDate: campaign.startDate,
            endDate: campaign.endDate,
          },
          update: {
            name: campaign.name,
            status: campaign.status,
            budgetAmountMicros: campaign.budgetAmountMicros,
            startDate: campaign.startDate,
            endDate: campaign.endDate,
          },
        });

        counts.campaigns++;
      }
    } catch (e) {
      errors.push(
        `Campaigns sync failed: ${e instanceof Error ? e.message : "Unknown error"}`
      );
    }

    // Update last synced timestamp
    await prisma.googleAdAccount.update({
      where: { id: accountDbId },
      data: { lastSynced: new Date() },
    });

    return {
      success: errors.length === 0,
      syncedAt: new Date(),
      counts,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (e) {
    return {
      success: false,
      syncedAt: new Date(),
      counts,
      errors: [e instanceof Error ? e.message : "Unknown error"],
    };
  }
}

/**
 * Sync all connected Google Ad accounts for a user
 */
export async function syncAllUserGoogleAccounts(
  userId: string
): Promise<GoogleSyncResult[]> {
  const accounts = await prisma.googleAdAccount.findMany({
    where: { userId, isActive: true },
  });

  const results: GoogleSyncResult[] = [];

  for (const account of accounts) {
    const result = await syncGoogleAdAccount(account.id);
    results.push(result);
  }

  return results;
}
