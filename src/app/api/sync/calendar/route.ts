import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { syncCalendar } from "@/lib/sync/calendar-sync";

export async function POST() {
  try {
    const userId = await requireUserId();
    const result = await syncCalendar(userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Calendar Sync API]", error);
    const message = error instanceof Error ? error.message : "Failed to sync calendar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
