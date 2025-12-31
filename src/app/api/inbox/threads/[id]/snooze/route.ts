import { NextRequest, NextResponse } from "next/server";
import { snoozeThread, unsnoozeThread } from "@/lib/db/inbox";
import { getUser } from "@/lib/supabase/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { until, unsnooze } = body;

    if (unsnooze === true) {
      await unsnoozeThread(id);
    } else if (until) {
      await snoozeThread(id, new Date(until));
    } else {
      return NextResponse.json(
        { error: "Missing 'until' date for snooze" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to snooze thread:", error);
    return NextResponse.json(
      { error: "Failed to snooze thread" },
      { status: 500 }
    );
  }
}

