// ============================================================================
// GET /api/lam/usage
// Check current API usage and spending limits
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getUsageStats, checkRateLimit, LAM_LIMITS } from "@/lam/rateLimit";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's rate limit status
    const rateCheck = await checkRateLimit(user.id);
    
    // Get global usage stats
    const globalStats = getUsageStats();

    return NextResponse.json({
      user: {
        requests_this_minute: rateCheck.usage.userMinute,
        requests_this_hour: rateCheck.usage.userHour,
        requests_today: rateCheck.usage.userDay,
        limits: {
          per_minute: LAM_LIMITS.REQUESTS_PER_MINUTE,
          per_hour: LAM_LIMITS.REQUESTS_PER_HOUR,
          per_day: LAM_LIMITS.REQUESTS_PER_DAY,
        },
      },
      spending: {
        estimated_today: `$${rateCheck.usage.estimatedDailySpend.toFixed(2)}`,
        estimated_this_month: `$${rateCheck.usage.estimatedMonthlySpend.toFixed(2)}`,
        limits: {
          daily: `$${LAM_LIMITS.MAX_DAILY_SPEND.toFixed(2)}`,
          monthly: `$${LAM_LIMITS.MAX_MONTHLY_SPEND.toFixed(2)}`,
        },
        percent_of_daily: ((rateCheck.usage.estimatedDailySpend / LAM_LIMITS.MAX_DAILY_SPEND) * 100).toFixed(1) + "%",
        percent_of_monthly: ((rateCheck.usage.estimatedMonthlySpend / LAM_LIMITS.MAX_MONTHLY_SPEND) * 100).toFixed(1) + "%",
      },
      status: rateCheck.allowed ? "ok" : "limited",
      message: rateCheck.allowed 
        ? "You can make API requests" 
        : rateCheck.reason,
    });
  } catch (error) {
    console.error("Usage check error:", error);
    return NextResponse.json(
      { error: "Failed to check usage" },
      { status: 500 }
    );
  }
}
