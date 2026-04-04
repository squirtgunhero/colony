import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { createCalendarEvent, listUpcomingEvents } from "@/lib/google-calendar";

/**
 * POST /api/calendar/events
 *
 * Create a Google Calendar event.
 * Body: { summary, startTime, endTime, description?, attendeeEmail?, location? }
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json();

    const { summary, startTime, endTime, description, attendeeEmail, location } = body;

    if (!summary || !startTime || !endTime) {
      return NextResponse.json(
        { error: "summary, startTime, and endTime are required" },
        { status: 400 }
      );
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format for startTime or endTime" },
        { status: 400 }
      );
    }

    const result = await createCalendarEvent(userId, {
      summary,
      description: description || undefined,
      startTime: start,
      endTime: end,
      attendeeEmail: attendeeEmail || undefined,
      location: location || undefined,
    });

    if (!result) {
      return NextResponse.json(
        { error: "No Google Calendar connected. Connect a Gmail account to schedule events." },
        { status: 422 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Calendar event creation error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to create calendar event" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/calendar/events?days=7
 *
 * List upcoming events from the user's primary Google Calendar.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const daysParam = request.nextUrl.searchParams.get("days");
    const days = daysParam ? parseInt(daysParam, 10) : 7;

    const events = await listUpcomingEvents(userId, isNaN(days) ? 7 : days);
    return NextResponse.json({ events });
  } catch (error) {
    console.error("Calendar events list error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to list events" },
      { status: 500 }
    );
  }
}
