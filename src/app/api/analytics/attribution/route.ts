// ============================================
// LEAD ATTRIBUTION ANALYTICS API
// GET /api/analytics/attribution - Lead source breakdown
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

/**
 * GET /api/analytics/attribution
 * Returns lead source attribution breakdown with counts, conversion rates, and costs
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

    // Get all contacts with their attribution data
    const contacts = await prisma.contact.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
      },
      select: {
        id: true,
        source: true,
        campaignChannel: true,
        campaignName: true,
        type: true,
        createdAt: true,
        deals: {
          select: {
            id: true,
            stage: true,
            value: true,
          },
        },
      },
    });

    // Group by source/channel
    const sourceMap = new Map<string, {
      source: string;
      leads: number;
      clients: number;
      deals: number;
      closedDeals: number;
      totalValue: number;
      closedValue: number;
    }>();

    for (const contact of contacts) {
      const source = contact.campaignChannel || contact.source || "unknown";
      const existing = sourceMap.get(source) || {
        source,
        leads: 0,
        clients: 0,
        deals: 0,
        closedDeals: 0,
        totalValue: 0,
        closedValue: 0,
      };

      existing.leads++;
      if (contact.type === "client") {
        existing.clients++;
      }

      for (const deal of contact.deals) {
        existing.deals++;
        existing.totalValue += deal.value || 0;
        if (deal.stage === "closed") {
          existing.closedDeals++;
          existing.closedValue += deal.value || 0;
        }
      }

      sourceMap.set(source, existing);
    }

    // Get campaign-level attribution
    const campaignMap = new Map<string, {
      campaignName: string;
      channel: string;
      leads: number;
      deals: number;
      closedDeals: number;
      closedValue: number;
    }>();

    for (const contact of contacts) {
      if (!contact.campaignName) continue;
      const key = `${contact.campaignChannel}:${contact.campaignName}`;
      const existing = campaignMap.get(key) || {
        campaignName: contact.campaignName,
        channel: contact.campaignChannel || "unknown",
        leads: 0,
        deals: 0,
        closedDeals: 0,
        closedValue: 0,
      };

      existing.leads++;
      for (const deal of contact.deals) {
        existing.deals++;
        if (deal.stage === "closed") {
          existing.closedDeals++;
          existing.closedValue += deal.value || 0;
        }
      }
      campaignMap.set(key, existing);
    }

    // Format source breakdown
    const bySource = Array.from(sourceMap.values())
      .map((s) => ({
        ...s,
        conversionRate: s.leads > 0
          ? ((s.closedDeals / s.leads) * 100).toFixed(1)
          : "0.0",
        avgDealValue: s.closedDeals > 0
          ? (s.closedValue / s.closedDeals).toFixed(2)
          : "0.00",
      }))
      .sort((a, b) => b.leads - a.leads);

    // Format campaign breakdown
    const byCampaign = Array.from(campaignMap.values())
      .map((c) => ({
        ...c,
        conversionRate: c.leads > 0
          ? ((c.closedDeals / c.leads) * 100).toFixed(1)
          : "0.0",
      }))
      .sort((a, b) => b.leads - a.leads);

    // Daily lead count by source
    const dailyLeads = contacts.reduce((acc, contact) => {
      const dateKey = contact.createdAt.toISOString().split("T")[0];
      const source = contact.campaignChannel || contact.source || "unknown";

      if (!acc[dateKey]) {
        acc[dateKey] = { date: dateKey, total: 0, bySrc: {} as Record<string, number> };
      }
      acc[dateKey].total++;
      acc[dateKey].bySrc[source] = (acc[dateKey].bySrc[source] || 0) + 1;

      return acc;
    }, {} as Record<string, { date: string; total: number; bySrc: Record<string, number> }>);

    // Totals
    const totalLeads = contacts.length;
    const totalDeals = contacts.reduce((sum, c) => sum + c.deals.length, 0);
    const totalClosedDeals = contacts.reduce(
      (sum, c) => sum + c.deals.filter((d) => d.stage === "closed").length,
      0
    );
    const totalClosedValue = contacts.reduce(
      (sum, c) =>
        sum + c.deals.filter((d) => d.stage === "closed").reduce((s, d) => s + (d.value || 0), 0),
      0
    );

    return NextResponse.json({
      totals: {
        leads: totalLeads,
        deals: totalDeals,
        closedDeals: totalClosedDeals,
        closedValue: totalClosedValue.toFixed(2),
        overallConversionRate: totalLeads > 0
          ? ((totalClosedDeals / totalLeads) * 100).toFixed(1)
          : "0.0",
      },
      bySource,
      byCampaign,
      dailyLeads: Object.values(dailyLeads).sort((a, b) => a.date.localeCompare(b.date)),
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching attribution data:", error);
    return NextResponse.json(
      { error: "Failed to fetch attribution data" },
      { status: 500 }
    );
  }
}
