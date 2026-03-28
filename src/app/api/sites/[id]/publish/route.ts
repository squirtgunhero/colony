import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

// POST /api/sites/[id]/publish — publish or unpublish a site
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireUserId();
  const { id } = await params;
  const { action } = await request.json(); // "publish" | "unpublish"

  const site = await prisma.landingPage.findFirst({
    where: { id, userId },
    select: { id: true, htmlContent: true, status: true },
  });

  if (!site) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (action === "publish") {
    if (!site.htmlContent) {
      return NextResponse.json(
        { error: "Generate a site before publishing" },
        { status: 400 }
      );
    }

    await prisma.landingPage.update({
      where: { id },
      data: {
        status: "published",
        publishedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, status: "published" });
  }

  if (action === "unpublish") {
    await prisma.landingPage.update({
      where: { id },
      data: {
        status: "draft",
        publishedAt: null,
      },
    });

    return NextResponse.json({ success: true, status: "draft" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
