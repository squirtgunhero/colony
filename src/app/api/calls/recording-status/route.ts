import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { processCallRecording } from "@/lib/calls/transcribe";

/**
 * Twilio recording status webhook.
 * Called when a call recording is completed or absent.
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const callSid = formData.get("CallSid") as string;
  const recordingSid = formData.get("RecordingSid") as string;
  const recordingUrl = formData.get("RecordingUrl") as string;
  const recordingStatus = formData.get("RecordingStatus") as string;
  const recordingDuration = formData.get("RecordingDuration") as string;

  console.log("[RecordingStatus] Webhook received:", { callSid, recordingSid, recordingStatus, recordingDuration });

  if (!callSid) {
    return NextResponse.json({ error: "Missing CallSid" }, { status: 400 });
  }

  try {
    // Find the call recording by callSid
    const recording = await prisma.callRecording.findUnique({
      where: { callSid },
    });

    if (!recording) {
      // Call might not have been initiated through our app
      console.warn(`No call recording found for CallSid: ${callSid}`);
      return NextResponse.json({ ok: true });
    }

    if (recordingStatus === "completed" && recordingUrl) {
      // Update with recording details
      const updated = await prisma.callRecording.update({
        where: { id: recording.id },
        data: {
          recordingSid,
          recordingUrl: `${recordingUrl}.wav`, // Twilio serves .wav by default
          duration: recordingDuration ? parseInt(recordingDuration) : null,
          status: "completed",
        },
      });

      // Run transcription + analysis after the response is sent
      after(async () => {
        try {
          await processCallRecording(updated.id);
        } catch (err) {
          console.error("Background call processing failed:", err);
        }
      });
    } else if (recordingStatus === "absent") {
      await prisma.callRecording.update({
        where: { id: recording.id },
        data: {
          status: "no-answer",
          analysisStatus: "failed",
          analysisError: "No recording available - call may not have been answered",
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Recording status webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
