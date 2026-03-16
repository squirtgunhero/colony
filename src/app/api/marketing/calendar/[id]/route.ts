// ============================================================================
// /api/marketing/calendar/[id] — single calendar event CRUD
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { prisma } from "@/lib/prisma";

// PATCH — update event
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.calendarEvent.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const event = await prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.channel !== undefined && { channel: body.channel }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.startDate !== undefined && { scheduledAt: new Date(body.startDate) }),
        ...(body.color !== undefined && { color: body.color }),
      },
    });

    return NextResponse.json({ event });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE — delete event
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const existing = await prisma.calendarEvent.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.calendarEvent.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
