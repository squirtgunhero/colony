// ============================================================================
// GET /api/properties/usage
// Return Melissa API usage stats for the current user
// ============================================================================

import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { getUsage } from "@/lib/melissa";

export async function GET() {
  try {
    const userId = await requireUserId();
    const usage = await getUsage(userId);
    return NextResponse.json(usage);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
