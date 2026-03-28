import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { computeAttribute, computeForEntity } from "@/lib/ai-attributes/engine";

/**
 * POST /api/ai-attributes/compute
 * Compute AI attribute(s) for an entity.
 * Body: { attributeId, entityId } for single
 * Body: { entityId, entityType } for all auto-run
 */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();

    if (!body.entityId) {
      return NextResponse.json({ error: "entityId required" }, { status: 400 });
    }

    if (body.attributeId) {
      const result = await computeAttribute(body.attributeId, body.entityId);
      return NextResponse.json(result);
    }

    const entityType = body.entityType || "contact";
    const result = await computeForEntity(body.entityId, entityType, userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[AI Attributes Compute]", error);
    const message = error instanceof Error ? error.message : "Computation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
