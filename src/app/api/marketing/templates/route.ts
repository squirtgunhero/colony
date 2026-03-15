// ============================================================================
// GET /api/marketing/templates — List templates
// POST /api/marketing/templates — Create custom template
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const subcategory = searchParams.get("subcategory");

    const where: Record<string, unknown> = {
      OR: [{ userId }, { isSystem: true }],
    };
    if (category) where.category = category;
    if (subcategory) where.subcategory = subcategory;

    const templates = await prisma.marketingTemplate.findMany({
      where,
      orderBy: [{ isSystem: "desc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json({ templates });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json();

    const template = await prisma.marketingTemplate.create({
      data: {
        userId,
        name: body.name,
        category: body.category,
        subcategory: body.subcategory || null,
        platform: body.platform || null,
        headline: body.headline || null,
        body: body.body,
        ctaText: body.ctaText || null,
        imageUrl: body.imageUrl || null,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
