import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { getCreatives, createCreative, type CreativeType } from "@/lib/db/honeycomb";
import type { CreativesResponse } from "@/lib/honeycomb/types";

const VALID_TYPES: CreativeType[] = ["image", "video", "carousel", "html"];

/**
 * GET /api/honeycomb/creatives
 * Returns list of creatives for the current user
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const creatives = await getCreatives();
    
    const response: CreativesResponse = {
      creatives: creatives.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        format: c.format || undefined,
        status: c.status,
        thumbnailUrl: c.thumbnailUrl || undefined,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to get honeycomb creatives:", error);
    return NextResponse.json(
      { error: "Failed to get creatives" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/honeycomb/creatives
 * Create a new creative
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
        { error: "Creative name is required" },
        { status: 400 }
      );
    }

    const type = body.type && VALID_TYPES.includes(body.type) ? body.type : "image";

    const creative = await createCreative({
      name: body.name.trim(),
      description: body.description?.trim(),
      type,
      format: body.format?.trim(),
      fileUrl: body.fileUrl?.trim(),
      thumbnailUrl: body.thumbnailUrl?.trim(),
      fileSize: body.fileSize ? parseInt(body.fileSize) : undefined,
      headline: body.headline?.trim(),
      bodyText: body.bodyText?.trim(),
      ctaText: body.ctaText?.trim(),
      ctaUrl: body.ctaUrl?.trim(),
    });

    return NextResponse.json({
      id: creative.id,
      name: creative.name,
      type: creative.type,
      format: creative.format,
      status: creative.status,
      thumbnailUrl: creative.thumbnailUrl,
      createdAt: creative.createdAt.toISOString(),
      updatedAt: creative.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create honeycomb creative:", error);
    return NextResponse.json(
      { error: "Failed to create creative" },
      { status: 500 }
    );
  }
}
