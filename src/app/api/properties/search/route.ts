// ============================================================================
// POST /api/properties/search
// Search for property data via Melissa Data API
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { lookupProperty, getUsage } from "@/lib/melissa";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const { address } = await request.json();

    if (!address || address.trim().length < 5) {
      return NextResponse.json(
        { error: "Valid address required" },
        { status: 400 }
      );
    }

    const result = await lookupProperty(address.trim(), userId);
    const usage = await getUsage(userId);

    return NextResponse.json({ property: result, usage });
  } catch (error: any) {
    if (error.message?.includes("limit")) {
      try {
        const userId = await requireUserId();
        const usage = await getUsage(userId);
        return NextResponse.json(
          { error: error.message, usage },
          { status: 429 }
        );
      } catch {
        return NextResponse.json(
          { error: error.message },
          { status: 429 }
        );
      }
    }
    return NextResponse.json(
      { error: error.message || "Search failed" },
      { status: 500 }
    );
  }
}
