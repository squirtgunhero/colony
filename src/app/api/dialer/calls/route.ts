import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { twilioPhoneNumber } from "@/lib/twilio-voice";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const contactId = searchParams.get("contactId");

    const where: Record<string, unknown> = { userId };
    if (contactId) where.contactId = contactId;

    const calls = await prisma.call.findMany({
      where,
      include: { contact: { select: { id: true, name: true, phone: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(calls);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const { contactId, toNumber, callListId, twilioCallSid } = body;

    const call = await prisma.call.create({
      data: {
        userId,
        contactId: contactId || null,
        callListId: callListId || null,
        toNumber,
        fromNumber: twilioPhoneNumber,
        twilioCallSid: twilioCallSid || null,
        direction: "outbound",
        status: "initiated",
      },
    });

    return NextResponse.json(call);
  } catch {
    return NextResponse.json({ error: "Failed to create call" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const { callId, notes, outcome, appointmentSet, appointmentDate, calendarEventId } = body;

    const call = await prisma.call.findFirst({
      where: { id: callId, userId },
    });

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const updated = await prisma.call.update({
      where: { id: callId },
      data: {
        ...(notes !== undefined && { notes }),
        ...(outcome !== undefined && { outcome }),
        ...(appointmentSet !== undefined && { appointmentSet }),
        ...(appointmentDate !== undefined && { appointmentDate: new Date(appointmentDate) }),
        ...(calendarEventId !== undefined && { calendarEventId }),
      },
    });

    // Also update the call list entry if this call is part of a list
    if (call.callListId && call.contactId) {
      await prisma.callListEntry.updateMany({
        where: {
          callListId: call.callListId,
          contactId: call.contactId,
        },
        data: {
          status: "completed",
          outcome: outcome || null,
          notes: notes || null,
          calledAt: new Date(),
        },
      });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update call" }, { status: 500 });
  }
}
