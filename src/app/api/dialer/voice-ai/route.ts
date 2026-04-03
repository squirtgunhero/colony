import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import Twilio from "twilio";

const twilioClient = Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

// POST — initiate a Voice AI call to a contact
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { contactId, objective = "qualify", callListId, userId: bodyUserId, internalSecret } = body;

  // Auth: either browser session OR internal server-to-server with shared secret
  let userId: string;
  if (internalSecret === process.env.INTERNAL_API_SECRET && bodyUserId) {
    userId = bodyUserId;
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    userId = user.id;
  }

  if (!contactId) {
    return NextResponse.json({ error: "contactId required" }, { status: 400 });
  }

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId },
  });
  if (!contact || !contact.phone) {
    return NextResponse.json({ error: "Contact not found or has no phone" }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.colony.so";

  // Create Call record
  const callRecord = await prisma.call.create({
    data: {
      userId,
      contactId: contact.id,
      callListId: callListId || null,
      direction: "outbound",
      status: "initiated",
      fromNumber: process.env.TWILIO_PHONE_NUMBER!,
      toNumber: contact.phone,
      startedAt: new Date(),
    },
  });

  try {
    // Initiate the call via Twilio REST API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const call = await (twilioClient.calls.create as any)({
      to: contact.phone,
      from: process.env.TWILIO_PHONE_NUMBER!,
      url: `${baseUrl}/api/dialer/voice-ai/twiml?callId=${callRecord.id}&contactName=${encodeURIComponent(contact.name)}&objective=${objective}`,
      statusCallback: `${baseUrl}/api/dialer/voice-ai/status?callId=${callRecord.id}`,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      statusCallbackMethod: "POST",
      machineDetection: "DetectMessageEnd",
      asyncAmd: "true",
      asyncAmdStatusCallback: `${baseUrl}/api/dialer/voice-ai/amd?callId=${callRecord.id}`,
    });

    await prisma.call.update({
      where: { id: callRecord.id },
      data: { twilioCallSid: call.sid },
    });

    return NextResponse.json({
      callId: callRecord.id,
      twilioSid: call.sid,
      status: "initiated",
    });
  } catch (error) {
    await prisma.call.update({
      where: { id: callRecord.id },
      data: { status: "failed" },
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Call failed" },
      { status: 500 }
    );
  }
}

// GET — get Voice AI call status
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const callId = request.nextUrl.searchParams.get("callId");
  if (!callId) return NextResponse.json({ error: "callId required" }, { status: 400 });

  const call = await prisma.call.findFirst({
    where: { id: callId, userId: user.id },
    include: { contact: { select: { id: true, name: true } } },
  });

  if (!call) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(call);
}
