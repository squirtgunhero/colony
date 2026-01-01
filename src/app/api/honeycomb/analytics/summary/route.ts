import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import type { AnalyticsSummaryResponse, AnalyticsSummary } from "@/lib/honeycomb/types";

/**
 * GET /api/honeycomb/analytics/summary
 * Returns analytics summary with performance data
 * Query params: from, to (ISO date strings for date range)
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return empty summary - no data yet
    const emptySummary: AnalyticsSummary = {
      totalImpressions: null,
      totalClicks: null,
      conversions: null,
      costPerConversion: null,
      performanceOverTime: [],
      channelBreakdown: [],
      topCampaigns: [],
      topCreatives: [],
    };

    const response: AnalyticsSummaryResponse = {
      summary: emptySummary,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to get honeycomb analytics:", error);
    return NextResponse.json(
      { error: "Failed to get analytics" },
      { status: 500 }
    );
  }
}

