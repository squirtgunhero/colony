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
 * After a call ends, poll Twilio's API for recordings on that CallSid.
 * This is a fallback for when Twilio's recordingStatusCallback doesn't fire.
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

  const { callSid } = await request.json();
  if (!callSid) {
    return NextResponse.json({ error: "callSid required" }, { status: 400 });
  }

  try {
    // Find the CallRecording entry
    const recording = await prisma.callRecording.findFirst({
      where: { callSid, userId: user.id },
    });

    if (!recording) {
      return NextResponse.json({ error: "No recording entry found" }, { status: 404 });
    }

    // Already processed
    if (recording.recordingUrl) {
      return NextResponse.json({ status: recording.status, hasRecording: true });
    }

    // Query Twilio for recordings on this call
    const recordings = await twilioClient.calls(callSid).recordings.list({ limit: 1 });

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

    // No recording found yet — call might not have been answered
    return NextResponse.json({ status: "no-recording", hasRecording: false });
  } catch (error) {
    console.error("Check recording error:", error);
    return NextResponse.json({ error: "Failed to check recording" }, { status: 500 });
  }
}
