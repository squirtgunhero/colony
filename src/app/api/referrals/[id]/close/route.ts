import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { closeReferral } from "@/lib/db/referrals";

/**
 * POST /api/referrals/:id/close
 * Close a referral (creator only)
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
    await closeReferral(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to close referral:", error);
    const message = error instanceof Error ? error.message : "Failed to close referral";
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && error.message.includes("not found") ? 404 : 500 }
    );
  }
}

