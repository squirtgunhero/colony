import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST — Marks a transfer as accepted by the agent.
 * Called after the agent's Twilio Device connects to the conference.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const { callId } = await request.json();

    if (!callId) {
      return NextResponse.json({ error: "callId is required" }, { status: 400 });
    }

    const call = await prisma.call.findUnique({
      where: { id: callId },
    });

    if (!call || call.userId !== userId) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    if (!call.transferRequested) {
      return NextResponse.json({ error: "No transfer pending" }, { status: 400 });
    }

    const conferenceName = `transfer-${callId}`;

    await prisma.call.update({
      where: { id: callId },
      data: {
        transferredAt: new Date(),
        outcome: "transferred",
      },
    });

    return NextResponse.json({
      ok: true,
      conferenceName,
    });
  } catch (error) {
    console.error("[Transfer Accept] Error:", error);
    return NextResponse.json({ error: "Failed to accept transfer" }, { status: 500 });
  }
}
