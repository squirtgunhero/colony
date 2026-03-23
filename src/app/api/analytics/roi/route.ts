// ============================================
// ROI ANALYTICS API
// GET /api/analytics/roi - ROI per campaign and channel
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

/**
 * GET /api/analytics/roi
 * Calculates ROI by combining ad spend (Meta + Google) with deal revenue
 * attributed to each channel/campaign
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const searchParams = request.nextUrl.searchParams;
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
      case "all":
        startDate = new Date(0);
        break;
      case "last_30d":
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    // ============================
    // Get ad spend by channel
    // ============================

    // Meta Ads spend
    const metaInsights = await prisma.metaInsight.findMany({
      where: {
        adAccount: { userId },
        date: { gte: startDate },
        level: "campaign",
      },
      select: { spend: true },
    });
    const metaSpend = metaInsights.reduce((sum, i) => sum + i.spend, 0);

    // Google Ads spend
    const googleInsights = await prisma.googleInsight.findMany({
      where: {
        account: { userId },
        date: { gte: startDate },
        level: "campaign",
      },
      select: { costMicros: true },
    });
    const googleSpend = googleInsights.reduce(
      (sum, i) => sum + Number(i.costMicros) / 1_000_000,
      0
    );

    // Honeycomb (native/LLM) spend
    const honeycombCampaigns = await prisma.honeycombCampaign.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
        status: { in: ["active", "completed"] },
      },
      select: { spend: true, channel: true },
    });
    const nativeSpend = honeycombCampaigns
      .filter((c) => c.channel === "native" || c.channel === "local")
      .reduce((sum, c) => sum + c.spend, 0);
    const llmSpend = honeycombCampaigns
      .filter((c) => c.channel === "llm")
      .reduce((sum, c) => sum + c.spend, 0);

    // ============================
    // Get revenue by channel (from attributed contacts → closed deals)
    // ============================

    const contactsWithDeals = await prisma.contact.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
        deals: {
          some: { stage: "closed" },
        },
      },
      select: {
        campaignChannel: true,
        source: true,
        deals: {
          where: { stage: "closed" },
          select: { value: true },
        },
      },
    });

    // Aggregate revenue by channel
    const revenueByChannel: Record<string, { revenue: number; closedDeals: number }> = {};
    for (const contact of contactsWithDeals) {
      const channel = contact.campaignChannel || contact.source || "unknown";
      if (!revenueByChannel[channel]) {
        revenueByChannel[channel] = { revenue: 0, closedDeals: 0 };
      }
      for (const deal of contact.deals) {
        revenueByChannel[channel].revenue += deal.value || 0;
        revenueByChannel[channel].closedDeals++;
      }
    }

    // ============================
    // Get lead counts by channel
    // ============================

    const leadsByChannel = await prisma.contact.groupBy({
      by: ["campaignChannel"],
      where: {
        userId,
        createdAt: { gte: startDate },
      },
      _count: { id: true },
    });

    const leadsBySource = await prisma.contact.groupBy({
      by: ["source"],
      where: {
        userId,
        createdAt: { gte: startDate },
        campaignChannel: null,
      },
      _count: { id: true },
    });

    // ============================
    // Build channel ROI table
    // ============================

    const channelSpend: Record<string, number> = {
      meta: metaSpend,
      google: googleSpend,
      native: nativeSpend,
      llm: llmSpend,
    };

    const allChannels = new Set([
      ...Object.keys(channelSpend),
      ...Object.keys(revenueByChannel),
      ...leadsByChannel.map((l) => l.campaignChannel || "unknown"),
      ...leadsBySource.map((l) => l.source || "unknown"),
    ]);

    const channelROI = Array.from(allChannels)
      .filter((ch) => ch !== "unknown")
      .map((channel) => {
        const spend = channelSpend[channel] || 0;
        const rev = revenueByChannel[channel] || { revenue: 0, closedDeals: 0 };
        const leadCount =
          leadsByChannel.find((l) => l.campaignChannel === channel)?._count.id ||
          leadsBySource.find((l) => l.source === channel)?._count.id ||
          0;

        const roi = spend > 0 ? ((rev.revenue - spend) / spend) * 100 : 0;
        const costPerLead = leadCount > 0 ? spend / leadCount : 0;
        const costPerDeal = rev.closedDeals > 0 ? spend / rev.closedDeals : 0;

        return {
          channel,
          spend: spend.toFixed(2),
          revenue: rev.revenue.toFixed(2),
          profit: (rev.revenue - spend).toFixed(2),
          roi: roi.toFixed(1),
          leads: leadCount,
          closedDeals: rev.closedDeals,
          costPerLead: costPerLead.toFixed(2),
          costPerDeal: costPerDeal.toFixed(2),
          avgDealValue: rev.closedDeals > 0
            ? (rev.revenue / rev.closedDeals).toFixed(2)
            : "0.00",
        };
      })
      .sort((a, b) => parseFloat(b.revenue) - parseFloat(a.revenue));

    // ============================
    // Overall totals
    // ============================

    const totalSpend = metaSpend + googleSpend + nativeSpend + llmSpend;
    const totalRevenue = Object.values(revenueByChannel).reduce(
      (sum, r) => sum + r.revenue,
      0
    );
    const totalLeads = leadsByChannel.reduce((sum, l) => sum + l._count.id, 0) +
      leadsBySource.reduce((sum, l) => sum + l._count.id, 0);
    const totalClosedDeals = Object.values(revenueByChannel).reduce(
      (sum, r) => sum + r.closedDeals,
      0
    );

    return NextResponse.json({
      totals: {
        spend: totalSpend.toFixed(2),
        revenue: totalRevenue.toFixed(2),
        profit: (totalRevenue - totalSpend).toFixed(2),
        roi: totalSpend > 0
          ? (((totalRevenue - totalSpend) / totalSpend) * 100).toFixed(1)
          : "0.0",
        leads: totalLeads,
        closedDeals: totalClosedDeals,
        costPerLead: totalLeads > 0 ? (totalSpend / totalLeads).toFixed(2) : "0.00",
        costPerDeal: totalClosedDeals > 0
          ? (totalSpend / totalClosedDeals).toFixed(2)
          : "0.00",
      },
      byChannel: channelROI,
      spendBreakdown: {
        meta: metaSpend.toFixed(2),
        google: googleSpend.toFixed(2),
        native: nativeSpend.toFixed(2),
        llm: llmSpend.toFixed(2),
      },
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching ROI data:", error);
    return NextResponse.json(
      { error: "Failed to fetch ROI data" },
      { status: 500 }
    );
  }
}
