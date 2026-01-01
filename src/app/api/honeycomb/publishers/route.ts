import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import type { PublishersResponse } from "@/lib/honeycomb/types";

/**
 * GET /api/honeycomb/publishers
 * Returns list of connected publishers and placements
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return empty arrays - no publishers connected yet
    const response: PublishersResponse = {
      publishers: [],
      placements: [],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to get honeycomb publishers:", error);
    return NextResponse.json(
      { error: "Failed to get publishers" },
      { status: 500 }
    );
  }
}

