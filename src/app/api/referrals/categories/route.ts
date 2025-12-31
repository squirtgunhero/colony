import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { getReferralCategories } from "@/lib/db/referrals";

/**
 * GET /api/referrals/categories
 * Get list of available referral categories
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const categories = await getReferralCategories();

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Failed to get referral categories:", error);
    return NextResponse.json(
      { error: "Failed to get referral categories" },
      { status: 500 }
    );
  }
}

