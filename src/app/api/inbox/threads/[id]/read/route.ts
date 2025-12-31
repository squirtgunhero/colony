import { NextRequest, NextResponse } from "next/server";
import { markThreadAsRead, markThreadAsUnread } from "@/lib/db/inbox";
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
    const body = await request.json().catch(() => ({}));
    const markAsUnread = body.unread === true;

    if (markAsUnread) {
      await markThreadAsUnread(id);
    } else {
      await markThreadAsRead(id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update read status:", error);
    return NextResponse.json(
      { error: "Failed to update read status" },
      { status: 500 }
    );
  }
}

