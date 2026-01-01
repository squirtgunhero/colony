import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { deleteSegment } from "@/lib/db/honeycomb";

/**
 * DELETE /api/honeycomb/segments/:id
 * Delete an audience segment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    
    try {
      const deleted = await deleteSegment(id);

      if (!deleted) {
        return NextResponse.json(
          { error: "Segment not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof Error && error.message.includes("in use")) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Failed to delete honeycomb segment:", error);
    return NextResponse.json(
      { error: "Failed to delete segment" },
      { status: 500 }
    );
  }
}

