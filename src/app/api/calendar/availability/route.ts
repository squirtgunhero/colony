import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { getAvailability } from "@/lib/google-calendar";

/**
 * GET /api/calendar/availability?startDate=...&endDate=...
 *
 * Returns busy slots from Google Calendar and computed available 30-min
 * time blocks within the requested window.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();

    const startParam = request.nextUrl.searchParams.get("startDate");
    const endParam = request.nextUrl.searchParams.get("endDate");

    if (!startParam || !endParam) {
      return NextResponse.json(
        { error: "startDate and endDate query params are required" },
        { status: 400 }
      );
    }

    const startDate = new Date(startParam);
    const endDate = new Date(endParam);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    const busySlots = await getAvailability(userId, startDate, endDate);

    // Build 30-minute time blocks within the window (business hours 8am-6pm)
    const available: { start: string; end: string }[] = [];
    const cursor = new Date(startDate);

    // Snap to the next 30-min boundary
    cursor.setMinutes(Math.ceil(cursor.getMinutes() / 30) * 30, 0, 0);

    while (cursor < endDate) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor.getTime() + 30 * 60 * 1000);

      const hour = slotStart.getHours();
      // Only include business hours (8am - 6pm)
      if (hour >= 8 && hour < 18) {
        const isBusy = busySlots.some((busy) => {
          const busyStart = new Date(busy.start).getTime();
          const busyEnd = new Date(busy.end).getTime();
          return slotStart.getTime() < busyEnd && slotEnd.getTime() > busyStart;
        });

        if (!isBusy) {
          available.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
          });
        }
      }

      cursor.setTime(cursor.getTime() + 30 * 60 * 1000);
    }

    return NextResponse.json({ busySlots, available });
  } catch (error) {
    console.error("Calendar availability error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}
