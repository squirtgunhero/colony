import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/calls/audio?id=<recordingId>
 * Proxy Twilio recording audio with auth so the browser can play it.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recordingId = request.nextUrl.searchParams.get("id");
  if (!recordingId) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const recording = await prisma.callRecording.findFirst({
    where: { id: recordingId, userId: user.id },
    select: { recordingUrl: true },
  });

  if (!recording?.recordingUrl) {
    return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  }

  // Fetch from Twilio with Basic Auth
  const audioRes = await fetch(recording.recordingUrl, {
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
      ).toString("base64")}`,
    },
  });

  if (!audioRes.ok) {
    return NextResponse.json({ error: "Failed to fetch audio" }, { status: 502 });
  }

  const audioBuffer = await audioRes.arrayBuffer();

  return new NextResponse(audioBuffer, {
    headers: {
      "Content-Type": "audio/wav",
      "Content-Length": String(audioBuffer.byteLength),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
