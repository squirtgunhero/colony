// ============================================
// META INSIGHTS API
// GET /api/meta/insights - Get performance analytics
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

/**
 * GET /api/meta/insights
 * Get aggregated insights and daily performance data
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get("accountId");
    const campaignId = searchParams.get("campaignId");
    const dateRange = searchParams.get("range") || "last_30d";

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (dateRange) {
      case "last_7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "last_14d":
        startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        break;
      case "last_90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "last_30d":
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    // Build where clause for insights
    const whereClause: Record<string, unknown> = {
      adAccount: { userId },
      date: { gte: startDate },
    };

    if (accountId) {
      whereClause.adAccountId = accountId;
    }

    if (campaignId) {
      whereClause.campaignId = campaignId;
    }

    // Get daily insights
    const dailyInsights = await prisma.metaInsight.findMany({
      where: whereClause,
      select: {
        date: true,
        impressions: true,
        clicks: true,
        spend: true,
        reach: true,
        conversions: true,
        ctr: true,
        cpc: true,
        cpm: true,
      },
      orderBy: { date: "asc" },
    });

    // Aggregate by date
    const dailyData = dailyInsights.reduce((acc, insight) => {
      const dateKey = insight.date.toISOString().split("T")[0];
      
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          impressions: 0,
          clicks: 0,
          spend: 0,
          reach: 0,
          conversions: 0,
        };
      }
      
      acc[dateKey].impressions += insight.impressions;
      acc[dateKey].clicks += insight.clicks;
      acc[dateKey].spend += insight.spend;
      acc[dateKey].reach += insight.reach;
      acc[dateKey].conversions += insight.conversions;
      
      return acc;
    }, {} as Record<string, { date: string; impressions: number; clicks: number; spend: number; reach: number; conversions: number }>);

    const chartData = Object.values(dailyData);

    // Calculate totals
    const totals = chartData.reduce(
      (acc, day) => ({
        impressions: acc.impressions + day.impressions,
        clicks: acc.clicks + day.clicks,
        spend: acc.spend + day.spend,
        reach: acc.reach + day.reach,
        conversions: acc.conversions + day.conversions,
      }),
      { impressions: 0, clicks: 0, spend: 0, reach: 0, conversions: 0 }
    );

    // Calculate averages
    const averages = {
      ctr: totals.impressions > 0 
        ? ((totals.clicks / totals.impressions) * 100).toFixed(2) 
        : "0.00",
      cpc: totals.clicks > 0 
        ? (totals.spend / totals.clicks).toFixed(2) 
        : "0.00",
      cpm: totals.impressions > 0 
        ? ((totals.spend / totals.impressions) * 1000).toFixed(2) 
        : "0.00",
      costPerConversion: totals.conversions > 0 
        ? (totals.spend / totals.conversions).toFixed(2) 
        : "0.00",
    };

    return NextResponse.json({
      totals: {
        ...totals,
        spend: totals.spend.toFixed(2),
      },
      averages,
      chartData,
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching Meta insights:", error);
    return NextResponse.json(
      { error: "Failed to fetch insights" },
      { status: 500 }
    );
  }
}
