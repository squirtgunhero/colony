// ============================================
// GOOGLE ADS UNIFIED API
// GET /api/ads/google - Aggregated Google Ads data
// ============================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  try {
    const userId = await requireUserId();

    // Check if user has connected Google Ads accounts
    const accounts = await prisma.googleAdAccount.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        customerId: true,
        descriptiveName: true,
        lastSynced: true,
        _count: {
          select: { campaigns: true },
        },
      },
    });

    if (accounts.length === 0) {
      return NextResponse.json(
        {
          status: "not_connected",
          message:
            "No Google Ads account connected. Go to Settings > Integrations to connect your account.",
        },
        { headers: CORS_HEADERS }
      );
    }

    // Get all campaigns with metrics
    const campaigns = await prisma.googleCampaign.findMany({
      where: {
        account: { userId },
        status: { not: "REMOVED" },
      },
      include: {
        account: {
          select: { descriptiveName: true, customerId: true },
        },
        _count: { select: { adGroups: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Aggregate totals
    const totals = campaigns.reduce(
      (acc, c) => ({
        impressions: acc.impressions + c.impressions,
        clicks: acc.clicks + c.clicks,
        spend: acc.spend + Number(c.costMicros) / 1_000_000,
        conversions: acc.conversions + c.conversions,
      }),
      { impressions: 0, clicks: 0, spend: 0, conversions: 0 }
    );

    return NextResponse.json(
      {
        status: "connected",
        accounts: accounts.map((a) => ({
          id: a.id,
          customerId: a.customerId,
          name: a.descriptiveName,
          lastSynced: a.lastSynced,
          campaignCount: a._count.campaigns,
        })),
        campaignCount: campaigns.length,
        activeCampaigns: campaigns.filter((c) => c.status === "ENABLED").length,
        totals: {
          impressions: totals.impressions,
          clicks: totals.clicks,
          spend: totals.spend.toFixed(2),
          conversions: totals.conversions,
          ctr: totals.impressions > 0
            ? ((totals.clicks / totals.impressions) * 100).toFixed(2)
            : "0.00",
          cpc: totals.clicks > 0
            ? (totals.spend / totals.clicks).toFixed(2)
            : "0.00",
        },
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("Error fetching Google Ads data:", error);
    return NextResponse.json(
      { error: "Failed to fetch Google Ads data" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
