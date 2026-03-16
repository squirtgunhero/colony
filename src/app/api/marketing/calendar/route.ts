// ============================================================================
// /api/marketing/calendar — CRUD for calendar events
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { prisma } from "@/lib/prisma";

// GET — list events
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // YYYY-MM

    let start: Date;
    let end: Date;

    if (month) {
      const [year, m] = month.split("-").map(Number);
      start = new Date(year, m - 1, 1);
      end = new Date(year, m, 1);
    } else {
      start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setMonth(end.getMonth() + 2);
    }

    const events = await prisma.calendarEvent.findMany({
      where: {
        userId,
        scheduledAt: { gte: start, lt: end },
      },
      orderBy: { scheduledAt: "asc" },
    });

    return NextResponse.json({ events });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — create event
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const { title, description, type, channel, startDate, color } = body;

    if (!title || !startDate || !type) {
      return NextResponse.json(
        { error: "Title, type, and start date are required" },
        { status: 400 }
      );
    }

    const event = await prisma.calendarEvent.create({
      data: {
        userId,
        title,
        description: description || null,
        type,
        channel: channel || null,
        scheduledAt: new Date(startDate),
        color: color || null,
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
