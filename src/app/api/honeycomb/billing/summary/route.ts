import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import type { BillingSummaryResponse, BillingSummary } from "@/lib/honeycomb/types";

/**
 * GET /api/honeycomb/billing/summary
 * Returns billing summary with plan, usage, and invoices
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return default free plan with no billing history
    const defaultBilling: BillingSummary = {
      plan: "free",
      monthlySpend: null,
      campaignsUsed: 0,
      campaignsLimit: null,
      creditsRemaining: null,
      nextBillingDate: null,
      paymentMethods: [],
      invoices: [],
    };

    const response: BillingSummaryResponse = {
      billing: defaultBilling,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to get honeycomb billing:", error);
    return NextResponse.json(
      { error: "Failed to get billing" },
      { status: 500 }
    );
  }
}

