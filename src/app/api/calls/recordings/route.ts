import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/calls/recordings?contactId=xxx
 * Fetch call recordings for a contact
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

  const contactId = request.nextUrl.searchParams.get("contactId");

  if (!contactId) {
    return NextResponse.json({ error: "contactId is required" }, { status: 400 });
  }

  try {
    const recordings = await prisma.callRecording.findMany({
      where: {
        userId: user.id,
        contactId,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        callSid: true,
        direction: true,
        fromNumber: true,
        toNumber: true,
        duration: true,
        status: true,
        transcript: true,
        summary: true,
        sentiment: true,
        sentimentScore: true,
        keyTopics: true,
        objections: true,
        talkListenRatio: true,
        actionItems: true,
        analysisStatus: true,
        recordingUrl: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ recordings });
  } catch (error) {
    console.error("Failed to fetch recordings:", error);
    return NextResponse.json(
      { error: "Failed to fetch recordings" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calls/recordings
 * Create a call recording entry when initiating a call
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

  try {
    const body = await request.json();
    const { callSid, contactId, toNumber, fromNumber } = body;

    if (!callSid || !toNumber) {
      return NextResponse.json(
        { error: "callSid and toNumber are required" },
        { status: 400 }
      );
    }

    const recording = await prisma.callRecording.create({
      data: {
        userId: user.id,
        contactId: contactId || null,
        callSid,
        direction: "outbound",
        fromNumber: fromNumber || process.env.TWILIO_PHONE_NUMBER || "",
        toNumber,
        status: "in-progress",
      },
    });

    // Create an Activity immediately so the call appears on the timeline
    // even if the recording webhook never fires (short call, no answer, etc.)
    let contactName: string | null = null;
    if (contactId) {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        select: { name: true },
      });
      contactName = contact?.name ?? null;
    }

    await prisma.activity.create({
      data: {
        userId: user.id,
        contactId: contactId || null,
        type: "call",
        title: `Outbound call to ${contactName || toNumber}`,
        description: "Call initiated from Colony dialer",
        metadata: JSON.stringify({
          callRecordingId: recording.id,
          callSid,
          toNumber,
          direction: "outbound",
        }),
      },
    });

    return NextResponse.json({ recording });
  } catch (error) {
    console.error("Failed to create recording:", error);
    return NextResponse.json(
      { error: "Failed to create recording" },
      { status: 500 }
    );
  }
}
