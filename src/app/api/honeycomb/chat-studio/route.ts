import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import type { ChatBotsResponse } from "@/lib/honeycomb/types";

/**
 * GET /api/honeycomb/chat-studio
 * Returns list of chat bots
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return empty array - no chat bots created yet
    const response: ChatBotsResponse = {
      chatBots: [],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to get honeycomb chat bots:", error);
    return NextResponse.json(
      { error: "Failed to get chat bots" },
      { status: 500 }
    );
  }
}

