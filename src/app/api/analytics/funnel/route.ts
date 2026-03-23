// ============================================
// CONVERSION FUNNEL ANALYTICS API
// GET /api/analytics/funnel - Full pipeline funnel metrics
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

const PIPELINE_STAGES = [
  { id: "new_lead", label: "New Lead" },
  { id: "qualified", label: "Qualified" },
  { id: "showing", label: "Showing" },
  { id: "offer", label: "Offer" },
  { id: "negotiation", label: "Negotiation" },
  { id: "closed", label: "Closed" },
];

/**
 * GET /api/analytics/funnel
 * Returns full conversion funnel: contacts → pipeline stages → closed deals
 * with stage-to-stage conversion rates and average time in each stage
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const searchParams = request.nextUrl.searchParams;
    const dateRange = searchParams.get("range") || "last_30d";
    const channel = searchParams.get("channel"); // optional filter by channel

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

    // Build contact filter
    const contactWhere: Record<string, unknown> = {
      userId,
      createdAt: { gte: startDate },
    };

    if (channel) {
      contactWhere.campaignChannel = channel;
    }

    // Get total contacts (top of funnel)
    const totalContacts = await prisma.contact.count({
      where: contactWhere,
    });

    // Get contacts that have at least one deal (entered pipeline)
    const contactsWithDeals = await prisma.contact.count({
      where: {
        ...contactWhere,
        deals: { some: {} },
      },
    });

    // Build deal filter
    const dealWhere: Record<string, unknown> = {
      userId,
      createdAt: { gte: startDate },
    };

    if (channel) {
      dealWhere.contact = { campaignChannel: channel };
    }

    // Get deals grouped by stage
    const dealsByStage = await prisma.deal.groupBy({
      by: ["stage"],
      where: dealWhere,
      _count: { id: true },
      _sum: { value: true },
    });

    // Build funnel stages
    const stageData = PIPELINE_STAGES.map((stage) => {
      const stageGroup = dealsByStage.find((d) => d.stage === stage.id);
      return {
        stage: stage.id,
        label: stage.label,
        count: stageGroup?._count.id || 0,
        value: stageGroup?._sum.value || 0,
      };
    });

    // Calculate cumulative counts (deals that have reached at least this stage)
    // Since deals are at their current stage, we need to count cumulatively from bottom
    const stageOrder = PIPELINE_STAGES.map((s) => s.id);
    const cumulativeCounts: number[] = new Array(stageOrder.length).fill(0);

    for (const deal of dealsByStage) {
      const stageIndex = stageOrder.indexOf(deal.stage);
      if (stageIndex >= 0) {
        // This deal has passed through all stages up to its current stage
        for (let i = 0; i <= stageIndex; i++) {
          cumulativeCounts[i] += deal._count.id;
        }
      }
    }

    // Build funnel with conversion rates
    const funnel = PIPELINE_STAGES.map((stage, index) => {
      const reachedCount = cumulativeCounts[index];
      const prevCount = index === 0 ? totalContacts : cumulativeCounts[index - 1];
      const stageInfo = stageData.find((s) => s.stage === stage.id);

      return {
        stage: stage.id,
        label: stage.label,
        currentCount: stageInfo?.count || 0,
        reachedCount,
        value: stageInfo?.value || 0,
        conversionFromPrevious: prevCount > 0
          ? ((reachedCount / prevCount) * 100).toFixed(1)
          : "0.0",
        conversionFromTop: totalContacts > 0
          ? ((reachedCount / totalContacts) * 100).toFixed(1)
          : "0.0",
      };
    });

    // Calculate velocity (avg days from contact creation to closed deal)
    const closedDeals = await prisma.deal.findMany({
      where: {
        ...dealWhere,
        stage: "closed",
      },
      select: {
        createdAt: true,
        updatedAt: true,
        contact: {
          select: { createdAt: true },
        },
        value: true,
      },
    });

    let avgDaysToClose = 0;
    let avgDealValue = 0;

    if (closedDeals.length > 0) {
      const totalDays = closedDeals.reduce((sum, deal) => {
        const contactCreated = deal.contact?.createdAt || deal.createdAt;
        const daysDiff = (deal.updatedAt.getTime() - contactCreated.getTime()) / (1000 * 60 * 60 * 24);
        return sum + daysDiff;
      }, 0);
      avgDaysToClose = Math.round(totalDays / closedDeals.length);

      const totalValue = closedDeals.reduce((sum, d) => sum + (d.value || 0), 0);
      avgDealValue = totalValue / closedDeals.length;
    }

    // Monthly trend
    const monthlyDeals = await prisma.deal.groupBy({
      by: ["stage"],
      where: {
        userId,
        stage: "closed",
        createdAt: { gte: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000) },
      },
      _count: { id: true },
      _sum: { value: true },
    });

    return NextResponse.json({
      topOfFunnel: {
        totalContacts,
        contactsWithDeals,
        contactToDealRate: totalContacts > 0
          ? ((contactsWithDeals / totalContacts) * 100).toFixed(1)
          : "0.0",
      },
      funnel,
      velocity: {
        avgDaysToClose,
        avgDealValue: avgDealValue.toFixed(2),
        closedDeals: closedDeals.length,
      },
      totalPipelineValue: stageData
        .filter((s) => s.stage !== "closed")
        .reduce((sum, s) => sum + s.value, 0)
        .toFixed(2),
      totalClosedValue: (stageData.find((s) => s.stage === "closed")?.value || 0).toFixed(2),
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching funnel data:", error);
    return NextResponse.json(
      { error: "Failed to fetch funnel data" },
      { status: 500 }
    );
  }
}
