// ============================================
// GOOGLE ADS CAMPAIGNS API
// GET /api/google-ads/campaigns - List campaigns with performance data
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

/**
 * GET /api/google-ads/campaigns
 * List all campaigns from connected Google Ad accounts with performance metrics
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get("accountId");
    const status = searchParams.get("status");

    // Build where clause
    const whereClause: Record<string, unknown> = {
      account: { userId },
    };

    if (accountId) {
      whereClause.accountId = accountId;
    }

    if (status) {
      whereClause.status = status;
    }

    const campaigns = await prisma.googleCampaign.findMany({
      where: whereClause,
      include: {
        account: {
          select: {
            descriptiveName: true,
            customerId: true,
          },
        },
        _count: {
          select: {
            adGroups: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Format response with calculated metrics
    const campaignsWithMetrics = campaigns.map((campaign) => {
      const spend = Number(campaign.costMicros) / 1_000_000;
      const budget = campaign.budgetAmountMicros
        ? Number(campaign.budgetAmountMicros) / 1_000_000
        : null;

      return {
        id: campaign.id,
        campaignId: campaign.campaignId,
        name: campaign.name,
        status: campaign.status,
        advertisingChannelType: campaign.advertisingChannelType,
        dailyBudget: budget ? budget.toFixed(2) : null,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        impressions: campaign.impressions,
        clicks: campaign.clicks,
        spend: spend.toFixed(2),
        conversions: campaign.conversions,
        ctr: campaign.impressions > 0
          ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2)
          : "0.00",
        cpc: campaign.clicks > 0
          ? (spend / campaign.clicks).toFixed(2)
          : "0.00",
        costPerConversion: campaign.conversions > 0
          ? (spend / campaign.conversions).toFixed(2)
          : "0.00",
        adGroupCount: campaign._count.adGroups,
        accountName: campaign.account.descriptiveName,
        customerId: campaign.account.customerId,
        updatedAt: campaign.updatedAt,
      };
    });

    return NextResponse.json({ campaigns: campaignsWithMetrics });
  } catch (error) {
    console.error("Error fetching Google Ads campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}
