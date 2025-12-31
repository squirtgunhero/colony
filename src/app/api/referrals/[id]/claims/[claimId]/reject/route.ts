import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { rejectClaim } from "@/lib/db/referrals";

/**
 * POST /api/referrals/:id/claims/:claimId/reject
 * Reject a claim (creator only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; claimId: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, claimId } = await params;
    await rejectClaim(id, claimId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to reject claim:", error);
    const message = error instanceof Error ? error.message : "Failed to reject claim";
    const status = message.includes("not found") ? 404 : message.includes("not in requested") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

