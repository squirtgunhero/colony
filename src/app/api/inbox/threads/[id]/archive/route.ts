import { NextRequest, NextResponse } from "next/server";
import { archiveThread, unarchiveThread } from "@/lib/db/inbox";
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
    const unarchive = body.unarchive === true;

    if (unarchive) {
      await unarchiveThread(id);
    } else {
      await archiveThread(id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to archive thread:", error);
    return NextResponse.json(
      { error: "Failed to archive thread" },
      { status: 500 }
    );
  }
}

