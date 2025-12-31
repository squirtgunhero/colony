import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { getReferralDetail, updateReferral } from "@/lib/db/referrals";
import type { ReferralVisibility } from "@/lib/db/referrals";

/**
 * GET /api/referrals/:id
 * Get referral details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const referral = await getReferralDetail(id);

    if (!referral) {
      return NextResponse.json(
        { error: "Referral not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(referral);
  } catch (error) {
    console.error("Failed to get referral:", error);
    return NextResponse.json(
      { error: "Failed to get referral" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/referrals/:id
 * Update a referral (creator only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    await updateReferral(id, {
      title: body.title,
      description: body.description,
      category: body.category,
      visibility: body.visibility as ReferralVisibility,
      locationText: body.locationText,
      valueEstimate: body.valueEstimate !== undefined
        ? parseFloat(body.valueEstimate)
        : undefined,
      currency: body.currency,
      metadata: body.metadata,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update referral:", error);
    const message = error instanceof Error ? error.message : "Failed to update referral";
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && error.message.includes("not found") ? 404 : 500 }
    );
  }
}

