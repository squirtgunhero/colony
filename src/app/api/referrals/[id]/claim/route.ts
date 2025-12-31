import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { claimReferral } from "@/lib/db/referrals";

/**
 * POST /api/referrals/:id/claim
 * Claim a referral
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const result = await claimReferral(id, body.message);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to claim referral:", error);
    const message = error instanceof Error ? error.message : "Failed to claim referral";
    const status = message.includes("not found") || message.includes("not open")
      ? 404
      : message.includes("Cannot claim") || message.includes("already have")
      ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

