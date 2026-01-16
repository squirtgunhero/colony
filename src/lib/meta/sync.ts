// ============================================
// META ADS SYNC SERVICE
// Sync campaigns, ad sets, ads, and insights from Meta
// ============================================

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { createMetaClient } from "./client";
import type {
  MetaCampaignResponse,
  MetaAdSetResponse,
  MetaAdResponse,
  MetaInsightsResponse,
  SyncResult,
  MappedCampaign,
  MappedAdSet,
  MappedAd,
  MappedInsight,
} from "./types";

// ============================================
// Mapper Functions
// ============================================

function mapCampaign(raw: MetaCampaignResponse): MappedCampaign {
  return {
    metaCampaignId: raw.id,
    name: raw.name,
    objective: raw.objective || null,
    status: raw.status,
    effectiveStatus: raw.effective_status || null,
    dailyBudget: raw.daily_budget ? parseFloat(raw.daily_budget) / 100 : null,
    lifetimeBudget: raw.lifetime_budget ? parseFloat(raw.lifetime_budget) / 100 : null,
    startTime: raw.start_time ? new Date(raw.start_time) : null,
    stopTime: raw.stop_time ? new Date(raw.stop_time) : null,
  };
}

function mapAdSet(raw: MetaAdSetResponse): MappedAdSet {
  return {
    metaAdSetId: raw.id,
    name: raw.name,
    status: raw.status,
    effectiveStatus: raw.effective_status || null,
    dailyBudget: raw.daily_budget ? parseFloat(raw.daily_budget) / 100 : null,
    lifetimeBudget: raw.lifetime_budget ? parseFloat(raw.lifetime_budget) / 100 : null,
    targetingJson: raw.targeting || undefined,
  };
}

function mapAd(raw: MetaAdResponse): MappedAd {
  return {
    metaAdId: raw.id,
    name: raw.name,
    status: raw.status,
    effectiveStatus: raw.effective_status || null,
    creativeId: raw.creative?.id || null,
    previewUrl: raw.preview_shareable_link || null,
  };
}

function mapInsight(raw: MetaInsightsResponse, level: string): MappedInsight {
  const actions = raw.actions || [];
  const conversions = actions.filter(a => 
    a.action_type.includes("purchase") || 
    a.action_type.includes("lead") ||
    a.action_type.includes("complete_registration")
  );
  const totalConversions = conversions.reduce((sum, a) => sum + parseInt(a.value), 0);
  
  const costPerAction = raw.cost_per_action_type || [];
  const leadCost = costPerAction.find(c => c.action_type === "lead");
  
  return {
    date: new Date(raw.date_start),
    level,
    impressions: parseInt(raw.impressions || "0"),
    clicks: parseInt(raw.clicks || "0"),
    spend: parseFloat(raw.spend || "0"),
    reach: parseInt(raw.reach || "0"),
    frequency: parseFloat(raw.frequency || "0"),
    ctr: parseFloat(raw.ctr || "0"),
    cpc: parseFloat(raw.cpc || "0"),
    cpm: parseFloat(raw.cpm || "0"),
    conversions: totalConversions,
    costPerResult: leadCost ? parseFloat(leadCost.value) : 0,
    actionsJson: raw.actions || undefined,
  };
}

// ============================================
// Sync Functions
// ============================================

/**
 * Sync all data for a connected Meta ad account
 */
export async function syncMetaAdAccount(adAccountDbId: string): Promise<SyncResult> {
  const errors: string[] = [];
  const counts = { campaigns: 0, adSets: 0, ads: 0, insights: 0 };

  try {
    // Get the ad account from database
    const adAccount = await prisma.metaAdAccount.findUnique({
      where: { id: adAccountDbId },
    });

    if (!adAccount) {
      throw new Error("Ad account not found");
    }

    if (!adAccount.accessToken) {
      throw new Error("No access token for ad account");
    }

    const client = createMetaClient(adAccount.accessToken);

    // Sync campaigns
    try {
      const campaignsResponse = await client.getCampaigns(adAccount.adAccountId);
      
      for (const rawCampaign of campaignsResponse.data) {
        const mapped = mapCampaign(rawCampaign);
        
        await prisma.metaCampaign.upsert({
          where: {
            adAccountId_metaCampaignId: {
              adAccountId: adAccountDbId,
              metaCampaignId: mapped.metaCampaignId,
            },
          },
          create: {
            adAccountId: adAccountDbId,
            ...mapped,
          },
          update: mapped,
        });
        
        counts.campaigns++;
      }
    } catch (e) {
      errors.push(`Campaigns sync failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    }

    // Get synced campaigns for ad set sync
    const campaigns = await prisma.metaCampaign.findMany({
      where: { adAccountId: adAccountDbId },
    });

    // Sync ad sets
    try {
      const adSetsResponse = await client.getAdSets(adAccount.adAccountId);
      
      for (const rawAdSet of adSetsResponse.data) {
        const campaign = campaigns.find(c => c.metaCampaignId === rawAdSet.campaign_id);
        if (!campaign) continue;

        const mapped = mapAdSet(rawAdSet);
        
        await prisma.metaAdSet.upsert({
          where: {
            campaignId_metaAdSetId: {
              campaignId: campaign.id,
              metaAdSetId: mapped.metaAdSetId,
            },
          },
          create: {
            campaignId: campaign.id,
            ...mapped,
          },
          update: mapped,
        });
        
        counts.adSets++;
      }
    } catch (e) {
      errors.push(`Ad sets sync failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    }

    // Get synced ad sets for ad sync
    const adSets = await prisma.metaAdSet.findMany({
      where: { campaign: { adAccountId: adAccountDbId } },
    });

    // Sync ads
    try {
      const adsResponse = await client.getAds(adAccount.adAccountId);
      
      for (const rawAd of adsResponse.data) {
        const adSet = adSets.find(as => as.metaAdSetId === rawAd.adset_id);
        if (!adSet) continue;

        const mapped = mapAd(rawAd);
        
        await prisma.metaAd.upsert({
          where: {
            adSetId_metaAdId: {
              adSetId: adSet.id,
              metaAdId: mapped.metaAdId,
            },
          },
          create: {
            adSetId: adSet.id,
            ...mapped,
          },
          update: mapped,
        });
        
        counts.ads++;
      }
    } catch (e) {
      errors.push(`Ads sync failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    }

    // Sync insights (last 30 days)
    try {
      const insightsResponse = await client.getInsightsByCampaign(adAccount.adAccountId, {
        date_preset: "last_30d",
        time_increment: 1, // Daily breakdown
      });
      
      for (const rawInsight of insightsResponse.data) {
        const campaign = campaigns.find(c => c.metaCampaignId === rawInsight.campaign_id);
        const mapped = mapInsight(rawInsight, "campaign");
        
        // Find existing insight or create new one
        const existingInsight = await prisma.metaInsight.findFirst({
          where: {
            adAccountId: adAccountDbId,
            campaignId: campaign?.id || null,
            adSetId: null,
            adId: null,
            date: mapped.date,
            level: mapped.level,
          },
        });

        if (existingInsight) {
          await prisma.metaInsight.update({
            where: { id: existingInsight.id },
            data: mapped,
          });
        } else {
          await prisma.metaInsight.create({
            data: {
              adAccountId: adAccountDbId,
              campaignId: campaign?.id || null,
              ...mapped,
            },
          });
        }
        
        counts.insights++;
      }
    } catch (e) {
      errors.push(`Insights sync failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    }

    // Update campaign aggregates
    for (const campaign of campaigns) {
      const aggregates = await prisma.metaInsight.aggregate({
        where: { campaignId: campaign.id },
        _sum: {
          impressions: true,
          clicks: true,
          spend: true,
          reach: true,
          conversions: true,
        },
      });

      await prisma.metaCampaign.update({
        where: { id: campaign.id },
        data: {
          impressions: aggregates._sum.impressions || 0,
          clicks: aggregates._sum.clicks || 0,
          spend: aggregates._sum.spend || 0,
          reach: aggregates._sum.reach || 0,
          conversions: aggregates._sum.conversions || 0,
        },
      });
    }

    // Update last synced timestamp
    await prisma.metaAdAccount.update({
      where: { id: adAccountDbId },
      data: { lastSyncedAt: new Date() },
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
 * Sync all connected Meta ad accounts for a user
 */
export async function syncAllUserMetaAccounts(userId: string): Promise<SyncResult[]> {
  const accounts = await prisma.metaAdAccount.findMany({
    where: { userId, status: "active" },
  });

  const results: SyncResult[] = [];

  for (const account of accounts) {
    const result = await syncMetaAdAccount(account.id);
    results.push(result);
  }

  return results;
}
