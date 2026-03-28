import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Twilio recording status callback webhook.
 * Called when a recording reaches 'completed' status.
 * Creates a CallRecording and queues it for transcription.
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const callSid = formData.get("CallSid") as string;
  const recordingSid = formData.get("RecordingSid") as string;
  const recordingUrl = formData.get("RecordingUrl") as string;
  const recordingStatus = formData.get("RecordingStatus") as string;
  const recordingDuration = formData.get("RecordingDuration") as string;
  const direction = (formData.get("Direction") as string) || "outbound";

  if (recordingStatus !== "completed" || !callSid || !recordingUrl) {
    return NextResponse.json({ received: true });
  }

  // Dedup: skip if we already have this recording
  const existing = await prisma.callRecording.findUnique({
    where: { twilioCallSid: callSid },
  });
  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Try to match this call to an existing Call record and contact
  const call = await prisma.call.findUnique({
    where: { twilioCallSid: callSid },
    select: { userId: true, contactId: true, direction: true },
  });

  // If no Call record, try matching by phone number
  let userId = call?.userId;
  let contactId = call?.contactId ?? null;
  const callDirection = call?.direction || (direction === "inbound" ? "inbound" : "outbound");

  if (!userId) {
    // Try to find the user from the Twilio phone number config
    const fromNumber = formData.get("From") as string | null;
    const toNumber = formData.get("To") as string | null;
    const matchNumber = callDirection === "inbound" ? fromNumber : toNumber;

    if (matchNumber) {
      // Match contact by phone
      const contact = await prisma.contact.findFirst({
        where: { phone: { contains: matchNumber.replace("+1", "").slice(-10) } },
        select: { id: true, userId: true },
      });
      if (contact) {
        contactId = contact.id;
        userId = contact.userId ?? undefined;
      }
    }

    // Fallback: use first user's ID (single-tenant assumption)
    if (!userId) {
      const firstProfile = await prisma.profile.findFirst({ select: { id: true } });
      userId = firstProfile?.id;
    }
  }

  if (!userId) {
    console.error("[CallRecording] Could not determine userId for call", callSid);
    return NextResponse.json({ error: "No user found" }, { status: 400 });
  }

  await prisma.callRecording.create({
    data: {
      userId,
      contactId,
      twilioCallSid: callSid,
      recordingSid,
      recordingUrl: `${recordingUrl}.mp3`,
      duration: parseInt(recordingDuration) || 0,
      direction: callDirection,
      status: "recorded",
      occurredAt: new Date(),
    },
  });

  return NextResponse.json({ received: true, queued: true });
}
