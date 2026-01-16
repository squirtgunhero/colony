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
      // Properties by status for stages
      prisma.property.findMany({
        where: { userId },
        select: {
          status: true,
          price: true,
        },
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

    // Group properties by status to create stages
    const stageMap = new Map<string, { count: number; value: number }>();
    for (const prop of properties) {
      const existing = stageMap.get(prop.status) || { count: 0, value: 0 };
      stageMap.set(prop.status, {
        count: existing.count + 1,
        value: existing.value + prop.price,
      });
    }

    const stageLabels: Record<string, string> = {
      active: "Active Listings",
      pending: "Pending",
      sold: "Closed/Sold",
      off_market: "Off Market",
    };

    const stages = Array.from(stageMap.entries())
      .map(([status, data]) => ({
        name: stageLabels[status] || status,
        count: data.count,
        value: data.value,
      }))
      .sort((a, b) => b.value - a.value);

    return NextResponse.json({
      totalValue,
      previousValue,
      stages,
      recentDeals: recentDeals.map((deal) => ({
        id: deal.id,
        name: deal.title,
        value: deal.value,
        stage: deal.stage,
      })),
    });
  } catch (error) {
    console.error("Pipeline summary error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pipeline summary" },
      { status: 500 }
    );
  }
}
