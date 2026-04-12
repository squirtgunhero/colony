// ============================================================================
// POST /api/agents/confirm
// Tool confirmation endpoint — approves or denies a paused tool call.
// Used for Tier 2 actions that require user approval before execution.
// ============================================================================

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendToolConfirmation } from "@/lib/agents/session-manager";

export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId, toolUseId, approved, threadId } = await req.json();

    if (!sessionId || !toolUseId || typeof approved !== "boolean") {
      return NextResponse.json(
        { error: "sessionId, toolUseId, and approved (boolean) are required" },
        { status: 400 }
      );
    }

    await sendToolConfirmation(sessionId, toolUseId, approved, threadId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AGENT] Confirm route error:", error);
    Sentry.captureException(error, {
      tags: { component: "agent", route: "/api/agents/confirm" },
    });
    const message =
      error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
