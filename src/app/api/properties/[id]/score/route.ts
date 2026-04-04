// ============================================================================
// POST /api/properties/[id]/score
// Score or re-score a single property's investment opportunity
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { prisma } from "@/lib/prisma";
import { scoreProperty } from "@/lib/property-scoring";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    // Verify user owns this property
    const property = await prisma.property.findFirst({
      where: { id, userId },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    const result = await scoreProperty(id);

    return NextResponse.json({
      score: result.score,
      grade: result.grade,
      reasoning: result.reasoning,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Scoring failed" },
      { status: 500 }
    );
  }
}
