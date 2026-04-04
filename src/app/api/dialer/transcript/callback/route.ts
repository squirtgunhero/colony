import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface TranscriptLine {
  speaker: string;
  text: string;
  timestamp: string;
  isFinal?: boolean;
}

// POST — Twilio real-time transcription callback endpoint
// Twilio sends transcription results here as they complete.
// No user auth — verified by CallSid lookup.
export async function POST(request: NextRequest) {
  try {
    // Twilio sends form-encoded data for transcription callbacks
    const contentType = request.headers.get("content-type") || "";
    let callSid: string | null = null;
    let transcriptionText: string | null = null;
    let transcriptionStatus: string | null = null;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      callSid = formData.get("CallSid") as string | null;
      transcriptionText = formData.get("TranscriptionText") as string | null;
      transcriptionStatus = formData.get("TranscriptionStatus") as string | null;

      // Twilio real-time transcription also sends these for <Transcription> verb:
      if (!transcriptionText) {
        transcriptionText = formData.get("transcript") as string | null;
      }
      if (!callSid) {
        callSid = formData.get("call_sid") as string | null;
      }
    } else {
      // JSON fallback
      const body = await request.json();
      callSid = body.CallSid || body.callSid || body.call_sid;
      transcriptionText = body.TranscriptionText || body.transcript || body.text;
      transcriptionStatus = body.TranscriptionStatus || body.status;
    }

    if (!callSid) {
      return NextResponse.json({ error: "CallSid required" }, { status: 400 });
    }

    // Only process completed transcriptions
    if (transcriptionStatus === "failed") {
      console.error("Transcription failed for CallSid:", callSid);
      return NextResponse.json({ received: true });
    }

    if (!transcriptionText || transcriptionText.trim() === "") {
      return NextResponse.json({ received: true });
    }

    // Look up the call by Twilio CallSid
    const call = await prisma.call.findFirst({
      where: { twilioCallSid: callSid },
      select: { id: true, liveTranscript: true },
    });

    if (!call) {
      console.error("Call not found for CallSid:", callSid);
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const existing = (call.liveTranscript as TranscriptLine[] | null) || [];
    const newLine: TranscriptLine = {
      speaker: "contact", // Twilio transcription captures the remote party
      text: transcriptionText.trim(),
      timestamp: new Date().toISOString(),
      isFinal: true,
    };

    await prisma.call.update({
      where: { id: call.id },
      data: {
        liveTranscript: [...existing, newLine] as unknown as import("@prisma/client").Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Transcript callback error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
