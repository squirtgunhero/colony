// ============================================
// META CAMPAIGNS API
// GET /api/meta/campaigns - List campaigns with performance data
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

/**
 * GET /api/meta/campaigns
 * List all campaigns from connected Meta ad accounts with performance metrics
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get("accountId");
    const status = searchParams.get("status");

    // Build where clause
    const whereClause: Record<string, unknown> = {
      adAccount: { userId },
    };

    if (accountId) {
      whereClause.adAccountId = accountId;
    }

    if (status) {
      whereClause.status = status;
    }

    const campaigns = await prisma.metaCampaign.findMany({
      where: whereClause,
      include: {
        adAccount: {
          select: {
            adAccountName: true,
            currency: true,
          },
        },
        _count: {
          select: {
            adSets: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Calculate CTR and CPC for each campaign
    const campaignsWithMetrics = campaigns.map((campaign) => ({
      id: campaign.id,
      metaCampaignId: campaign.metaCampaignId,
      name: campaign.name,
      objective: campaign.objective,
      status: campaign.status,
      effectiveStatus: campaign.effectiveStatus,
      dailyBudget: campaign.dailyBudget,
      lifetimeBudget: campaign.lifetimeBudget,
      startTime: campaign.startTime,
      stopTime: campaign.stopTime,
      impressions: campaign.impressions,
      clicks: campaign.clicks,
      spend: campaign.spend,
      reach: campaign.reach,
      conversions: campaign.conversions,
      ctr: campaign.impressions > 0 
        ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2) 
        : "0.00",
      cpc: campaign.clicks > 0 
        ? (campaign.spend / campaign.clicks).toFixed(2) 
        : "0.00",
      cpm: campaign.impressions > 0 
        ? ((campaign.spend / campaign.impressions) * 1000).toFixed(2) 
        : "0.00",
      adSetCount: campaign._count.adSets,
      accountName: campaign.adAccount.adAccountName,
      currency: campaign.adAccount.currency,
      updatedAt: campaign.updatedAt,
    }));

    return NextResponse.json({ campaigns: campaignsWithMetrics });
  } catch (error) {
    console.error("Error fetching Meta campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}
