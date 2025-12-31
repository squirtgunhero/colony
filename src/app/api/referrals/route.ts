import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { getReferrals, createReferral, getReferralCategories } from "@/lib/db/referrals";
import type { ReferralFilters, ReferralVisibility } from "@/lib/db/referrals";

/**
 * GET /api/referrals
 * List referrals with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    
    const filters: ReferralFilters = {};
    
    const status = searchParams.get("status");
    if (status) filters.status = status as ReferralFilters["status"];
    
    const category = searchParams.get("category");
    if (category) filters.category = category;
    
    const location = searchParams.get("location");
    if (location) filters.location = location;
    
    const visibility = searchParams.get("visibility");
    if (visibility) filters.visibility = visibility as ReferralFilters["visibility"];
    
    const createdByMe = searchParams.get("createdByMe");
    if (createdByMe === "true") filters.createdByMe = true;
    
    const participatingIn = searchParams.get("participatingIn");
    if (participatingIn === "true") filters.participatingIn = true;
    
    const search = searchParams.get("search");
    if (search) filters.search = search;

    const cursor = searchParams.get("cursor") ?? undefined;
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);

    const result = await getReferrals(filters, cursor, limit);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to get referrals:", error);
    return NextResponse.json(
      { error: "Failed to get referrals" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/referrals
 * Create a new referral
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.title || typeof body.title !== "string") {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (!body.category || typeof body.category !== "string") {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 }
      );
    }

    const result = await createReferral({
      title: body.title,
      description: body.description,
      category: body.category,
      visibility: body.visibility as ReferralVisibility,
      locationText: body.locationText,
      valueEstimate: body.valueEstimate ? parseFloat(body.valueEstimate) : undefined,
      currency: body.currency,
      metadata: body.metadata,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to create referral:", error);
    return NextResponse.json(
      { error: "Failed to create referral" },
      { status: 500 }
    );
  }
}

