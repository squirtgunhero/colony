import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import type { KeywordsResponse } from "@/lib/honeycomb/types";

/**
 * GET /api/honeycomb/keywords
 * Returns list of keywords and suggestions
 * Query params: query, category
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return empty arrays - no keywords saved yet
    const response: KeywordsResponse = {
      keywords: [],
      suggestions: [],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to get honeycomb keywords:", error);
    return NextResponse.json(
      { error: "Failed to get keywords" },
      { status: 500 }
    );
  }
}

