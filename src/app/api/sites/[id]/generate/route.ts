import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { prisma } from "@/lib/prisma";
import { generateSite } from "@/lib/site-builder";

// POST /api/sites/[id]/generate — AI generation/iteration
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireUserId();
  const { id } = await params;
  const { prompt } = await request.json();

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json(
      { error: "Prompt is required" },
      { status: 400 }
    );
  }

  // Verify ownership
  const site = await prisma.landingPage.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!site) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const result = await generateSite({ siteId: id, userId, prompt });

    return NextResponse.json({
      html: result.html,
      revisionId: result.revisionId,
      version: result.version,
      tokensUsed: result.tokensUsed,
    });
  } catch (error) {
    console.error("Site generation error:", error);
    return NextResponse.json(
      { error: "Generation failed. Please try again." },
      { status: 500 }
    );
  }
}
