import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { getDashboardKpis } from "@/lib/db/honeycomb";
import type { DashboardResponse, DashboardKpis } from "@/lib/honeycomb/types";

/**
 * GET /api/honeycomb/dashboard
 * Returns dashboard KPIs and recent activity
 * Query params: from, to (ISO date strings for date range)
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const kpis = await getDashboardKpis();

    // Show actual values if user has campaigns, otherwise null (to show empty state)
    const hasData = kpis.totalCampaigns > 0;

    const dashboardKpis: DashboardKpis = {
      activeCampaigns: hasData ? kpis.activeCampaigns : null,
      totalImpressions: hasData ? kpis.impressions : null,
      clickThroughRate: hasData ? kpis.ctr : null,
      totalSpend: hasData ? kpis.spend : null,
    };

    const response: DashboardResponse = {
      kpis: dashboardKpis,
      recentActivity: [],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to get honeycomb dashboard:", error);
    return NextResponse.json(
      { error: "Failed to get dashboard" },
      { status: 500 }
    );
  }
}
