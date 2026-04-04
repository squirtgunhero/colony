import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { prisma } from "@/lib/prisma";
import { twilioClient } from "@/lib/twilio";

/**
 * POST — Initiates a transfer: redirects the AI call into a conference room
 * so the human agent can join via their Twilio Device.
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
      include: { contact: { select: { name: true } } },
    });

    if (!call || call.userId !== userId) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    if (!call.twilioCallSid) {
      return NextResponse.json({ error: "No active Twilio call" }, { status: 400 });
    }

    if (call.transferRequested) {
      return NextResponse.json({ error: "Transfer already requested" }, { status: 400 });
    }

    const conferenceName = `transfer-${callId}`;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.colony.so";
    const twimlUrl = `${baseUrl}/api/dialer/voice-ai/transfer/twiml?callId=${callId}`;

    // Redirect the live Twilio call to the conference TwiML
    await twilioClient.calls(call.twilioCallSid).update({
      url: twimlUrl,
      method: "POST",
    });

    // Mark call as transfer requested
    await prisma.call.update({
      where: { id: callId },
      data: { transferRequested: true },
    });

    return NextResponse.json({
      ok: true,
      conferenceName,
      contactName: call.contact?.name || "Unknown",
    });
  } catch (error) {
    console.error("[Transfer] Error initiating transfer:", error);
    return NextResponse.json({ error: "Failed to initiate transfer" }, { status: 500 });
  }
}
