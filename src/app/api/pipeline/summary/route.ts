// ============================================
// COLONY - Pipeline Summary API
// Returns pipeline data for the context drawer
// ============================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/supabase/auth";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;

    // Calculate date for previous period comparison
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch pipeline data
    const [
      totalValueResult,
      previousValueResult,
      properties,
      recentDeals,
    ] = await Promise.all([
      // Current total pipeline value
      prisma.property.aggregate({
        where: { userId, status: { not: "sold" } },
        _sum: { price: true },
      }),
      // Previous period value
      prisma.property.aggregate({
        where: {
          userId,
          status: { not: "sold" },
          createdAt: { lt: startOfCurrentMonth },
        },
        _sum: { price: true },
      }),
      // Properties grouped by status for stages
      prisma.property.groupBy({
        by: ["status"],
        where: { userId },
        _count: { _all: true },
        _sum: { price: true },
      }),
      // Recent deals
      prisma.deal.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          value: true,
          stage: true,
        },
      }),
    ]);

    const totalValue = totalValueResult._sum.price || 0;
    const previousValue = previousValueResult._sum.price || 0;

    const stageLabels: Record<string, string> = {
      active: "Active Listings",
      pending: "Pending",
      sold: "Closed/Sold",
      off_market: "Off Market",
    };

    const stages = properties
      .map((group) => ({
        name: stageLabels[group.status] || group.status,
        count: group._count._all,
        value: group._sum.price || 0,
      }))
      .sort((a, b) => b.value - a.value);

    return NextResponse.json(
      {
        totalValue,
        previousValue,
        stages,
        recentDeals: recentDeals.map((deal) => ({
          id: deal.id,
          name: deal.title,
          value: deal.value,
          stage: deal.stage,
        })),
      },
      { headers: { "Cache-Control": "private, max-age=60" } }
    );
  } catch (error) {
    console.error("Pipeline summary error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pipeline summary" },
      { status: 500 }
    );
  }
}
