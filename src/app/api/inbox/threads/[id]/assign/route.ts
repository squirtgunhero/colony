import { NextRequest, NextResponse } from "next/server";
import { assignThread } from "@/lib/db/inbox";
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
    const { userId: assigneeUserId } = body;

    await assignThread(id, assigneeUserId || null);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to assign thread:", error);
    const message = error instanceof Error ? error.message : "Failed to assign thread";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

