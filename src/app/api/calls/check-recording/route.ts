import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Twilio from "twilio";
import { processCallRecording } from "@/lib/calls/transcribe";

const twilioClient = Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

/**
 * POST /api/calls/check-recording
 * After a call ends, find the most recent in-progress recording for this user
 * and poll Twilio's API for the actual recording file.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { contactId } = body;

  try {
    // Find the most recent in-progress recording for this user
    const recording = await prisma.callRecording.findFirst({
      where: {
        userId: user.id,
        status: "in-progress",
        ...(contactId ? { contactId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    if (!recording) {
      console.log("[CheckRecording] No in-progress recording found for user:", user.id);
      return NextResponse.json({ status: "no-recording", hasRecording: false });
    }

    console.log("[CheckRecording] Found recording:", recording.id, "callSid:", recording.callSid);

    // Already processed
    if (recording.recordingUrl) {
      return NextResponse.json({ status: recording.status, hasRecording: true });
    }

    // Query Twilio for recordings on this call
    const recordings = await twilioClient.calls(recording.callSid).recordings.list({ limit: 1 });
    console.log("[CheckRecording] Twilio recordings found:", recordings.length);

    if (recordings.length > 0) {
      const rec = recordings[0];
      const recordingUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Recordings/${rec.sid}.wav`;

      const updated = await prisma.callRecording.update({
        where: { id: recording.id },
        data: {
          recordingSid: rec.sid,
          recordingUrl,
          duration: rec.duration ? parseInt(String(rec.duration)) : null,
          status: "completed",
        },
      });

      // Fire-and-forget: start transcription + analysis
      processCallRecording(updated.id).catch((err) => {
        console.error("Background call processing failed:", err);
      });

      return NextResponse.json({ status: "completed", hasRecording: true });
    }

    // No recording found — update status
    await prisma.callRecording.update({
      where: { id: recording.id },
      data: { status: "no-answer" },
    });

    return NextResponse.json({ status: "no-recording", hasRecording: false });
  } catch (error) {
    console.error("Check recording error:", error);
    return NextResponse.json({ error: "Failed to check recording" }, { status: 500 });
  }
}
