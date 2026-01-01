import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { updateCreativeStatus, type CreativeStatus } from "@/lib/db/honeycomb";

const VALID_STATUSES: CreativeStatus[] = ["draft", "approved", "rejected", "archived"];

/**
 * POST /api/honeycomb/creatives/:id/status
 * Update creative status
 */
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

    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const creative = await updateCreativeStatus(id, body.status);

    if (!creative) {
      return NextResponse.json(
        { error: "Creative not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: creative.id,
      name: creative.name,
      status: creative.status,
      updatedAt: creative.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Failed to update creative status:", error);
    return NextResponse.json(
      { error: "Failed to update creative status" },
      { status: 500 }
    );
  }
}

