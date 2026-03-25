import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { prisma } from "@/lib/prisma";
import { dropVoicemailOnCall } from "@/lib/twilio-voice";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const { callId, voicemailDropId } = await request.json();

    const [call, voicemail] = await Promise.all([
      prisma.call.findFirst({ where: { id: callId, userId } }),
      prisma.voicemailDrop.findFirst({ where: { id: voicemailDropId, userId } }),
    ]);

    if (!call?.twilioCallSid) {
      return NextResponse.json({ error: "Call not found or no active session" }, { status: 404 });
    }

    if (!voicemail) {
      return NextResponse.json({ error: "Voicemail recording not found" }, { status: 404 });
    }

    await dropVoicemailOnCall(call.twilioCallSid, voicemail.recordingUrl);

    await prisma.call.update({
      where: { id: callId },
      data: { outcome: "left_voicemail" },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Voicemail drop error:", error);
    return NextResponse.json({ error: "Failed to drop voicemail" }, { status: 500 });
  }
}
