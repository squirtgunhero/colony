import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { getSegments, createSegment, type SegmentType } from "@/lib/db/honeycomb";
import type { SegmentsResponse } from "@/lib/honeycomb/types";

const VALID_TYPES: SegmentType[] = ["saved", "custom", "lookalike"];

/**
 * GET /api/honeycomb/segments
 * Returns list of audience segments for the current user
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const segments = await getSegments();
    
    const response: SegmentsResponse = {
      segments: segments.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description || undefined,
        type: s.type,
        size: s.size || undefined,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to get honeycomb segments:", error);
    return NextResponse.json(
      { error: "Failed to get segments" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/honeycomb/segments
 * Create a new audience segment
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
      return NextResponse.json(
        { error: "Segment name is required" },
        { status: 400 }
      );
    }

    const type = body.type && VALID_TYPES.includes(body.type) ? body.type : "custom";

    const segment = await createSegment({
      name: body.name.trim(),
      description: body.description?.trim(),
      type,
      criteria: body.criteria || {},
    });

    return NextResponse.json({
      id: segment.id,
      name: segment.name,
      description: segment.description,
      type: segment.type,
      size: segment.size,
      createdAt: segment.createdAt.toISOString(),
      updatedAt: segment.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create honeycomb segment:", error);
    return NextResponse.json(
      { error: "Failed to create segment" },
      { status: 500 }
    );
  }
}
