import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

// GET /api/calls/recordings?contactId=xxx
export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  const contactId = req.nextUrl.searchParams.get("contactId");

  const where: Record<string, unknown> = { userId };
  if (contactId) where.contactId = contactId;

  const recordings = await prisma.callRecording.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    take: 20,
    include: {
      contact: { select: { name: true } },
    },
  });

  return NextResponse.json(
    recordings.map((r) => ({
      id: r.id,
      contactName: r.contact?.name ?? null,
      twilioCallSid: r.twilioCallSid,
      recordingUrl: r.recordingUrl,
      duration: r.duration,
      direction: r.direction,
      status: r.status,
      transcript: r.transcript,
      summary: r.summary,
      actionItems: r.actionItems,
      sentiment: r.sentiment,
      occurredAt: r.occurredAt.toISOString(),
    }))
  );
}
