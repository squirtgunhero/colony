import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

interface TranscriptLine {
  speaker: string;
  text: string;
  timestamp: string;
  isFinal?: boolean;
}

// GET — Returns current transcript array for a call
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(request.url);
    const callId = searchParams.get("callId");

    if (!callId) {
      return NextResponse.json({ error: "callId required" }, { status: 400 });
    }

    const call = await prisma.call.findFirst({
      where: { id: callId, userId },
      select: { liveTranscript: true },
    });

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const transcript = (call.liveTranscript as TranscriptLine[] | null) || [];
    return NextResponse.json({ transcript });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// POST — Append transcript chunks (called by server-side stream processor)
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const { callId, speaker, text, timestamp, isFinal } = body;

    if (!callId || !text) {
      return NextResponse.json({ error: "callId and text required" }, { status: 400 });
    }

    const call = await prisma.call.findFirst({
      where: { id: callId, userId },
      select: { liveTranscript: true },
    });

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const existing = (call.liveTranscript as TranscriptLine[] | null) || [];
    const newLine: TranscriptLine = {
      speaker: speaker || "unknown",
      text,
      timestamp: timestamp || new Date().toISOString(),
      isFinal: isFinal ?? true,
    };

    await prisma.call.update({
      where: { id: callId },
      data: {
        liveTranscript: [...existing, newLine] as unknown as import("@prisma/client").Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to append transcript" }, { status: 500 });
  }
}
