import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { computeAttribute, computeForEntity } from "@/lib/ai-attributes/engine";
import { seedPresetAttributes } from "@/lib/ai-attributes/presets";

/**
 * GET /api/ai-attributes
 * List all AI attributes for the current user.
 * Query params: ?entityType=contact&includeValues=true&entityId=xxx
 */
export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");
    const includeValues = searchParams.get("includeValues") === "true";
    const entityId = searchParams.get("entityId");

    const where: Record<string, unknown> = { userId };
    if (entityType) where.entityType = entityType;

    const attributes = await prisma.aiAttribute.findMany({
      where,
      include: includeValues && entityId
        ? { values: { where: { entityId } } }
        : undefined,
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ attributes });
  } catch (error) {
    console.error("[AI Attributes]", error);
    return NextResponse.json({ error: "Failed to fetch attributes" }, { status: 500 });
  }
}

/**
 * POST /api/ai-attributes
 * Create a new AI attribute or seed presets.
 * Body: { seed: true } to seed presets
 * Body: { name, entityType, outputType, prompt, ... } to create custom
 */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();

    if (body.seed) {
      const seeded = await seedPresetAttributes(userId);
      return NextResponse.json({ seeded });
    }

    const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const attribute = await prisma.aiAttribute.create({
      data: {
        userId,
        name: body.name,
        slug,
        entityType: body.entityType || "contact",
        outputType: body.outputType || "text",
        options: body.options || undefined,
        prompt: body.prompt,
        contextFields: body.contextFields || [],
        autoRun: body.autoRun ?? false,
      },
    });

    return NextResponse.json({ attribute });
  } catch (error) {
    console.error("[AI Attributes]", error);
    return NextResponse.json({ error: "Failed to create attribute" }, { status: 500 });
  }
}

/**
 * PUT /api/ai-attributes
 * Update an existing AI attribute.
 * Body: { id, ...fields }
 */
export async function PUT(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: "Attribute ID required" }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.aiAttribute.findFirst({
      where: { id: body.id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Attribute not found" }, { status: 404 });
    }

    const { id, ...updates } = body;
    const attribute = await prisma.aiAttribute.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ attribute });
  } catch (error) {
    console.error("[AI Attributes]", error);
    return NextResponse.json({ error: "Failed to update attribute" }, { status: 500 });
  }
}

/**
 * DELETE /api/ai-attributes
 * Delete an AI attribute.
 * Body: { id }
 */
export async function DELETE(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: "Attribute ID required" }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.aiAttribute.findFirst({
      where: { id: body.id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Attribute not found" }, { status: 404 });
    }

    await prisma.aiAttribute.delete({ where: { id: body.id } });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[AI Attributes]", error);
    return NextResponse.json({ error: "Failed to delete attribute" }, { status: 500 });
  }
}
