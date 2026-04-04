import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { prisma } from "@/lib/prisma";

// POST — Start real-time transcription on an active Twilio call
// Uses Twilio REST API to enable transcription with a callback URL
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const { callId } = body;

    if (!callId) {
      return NextResponse.json({ error: "callId required" }, { status: 400 });
    }

    // Verify the call belongs to this user and get the CallSid
    const call = await prisma.call.findFirst({
      where: { id: callId, userId },
      select: { id: true, twilioCallSid: true },
    });

    if (!call || !call.twilioCallSid) {
      return NextResponse.json({ error: "Call not found or no CallSid" }, { status: 404 });
    }

    // Check if Twilio transcription is enabled
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;

    if (!accountSid || !authToken) {
      return NextResponse.json({ error: "Twilio credentials not configured" }, { status: 500 });
    }

    if (!baseUrl) {
      return NextResponse.json({ error: "App URL not configured" }, { status: 500 });
    }

    const callbackUrl = `${baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`}/api/dialer/transcript/callback`;

    // Use Twilio REST API to update the call with recording + transcription
    // This starts a recording with real-time transcription callbacks
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${call.twilioCallSid}/Recordings.json`;

    const recordingParams = new URLSearchParams({
      RecordingStatusCallback: callbackUrl,
      RecordingStatusCallbackEvent: "in-progress completed",
      // Enable transcription on the recording
      TranscriptionCallback: callbackUrl,
    });

    const twilioRes = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: recordingParams.toString(),
    });

    if (!twilioRes.ok) {
      const errText = await twilioRes.text();
      console.error("Twilio recording start failed:", errText);
      return NextResponse.json(
        { error: "Failed to start transcription", details: errText },
        { status: 500 }
      );
    }

    const recordingData = await twilioRes.json();

    // Initialize the liveTranscript array if not already set
    await prisma.call.update({
      where: { id: callId },
      data: {
        liveTranscript: call.twilioCallSid ? undefined : [],
      },
    });

    return NextResponse.json({
      success: true,
      recordingSid: recordingData.sid,
    });
  } catch (err) {
    console.error("Start transcription error:", err);
    return NextResponse.json({ error: "Failed to start transcription" }, { status: 500 });
  }
}
