import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

// GET /api/sites/[id]/revisions — get version history
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireUserId();
  const { id } = await params;

  const site = await prisma.landingPage.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!site) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const revisions = await prisma.siteRevision.findMany({
    where: { landingPageId: id },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      prompt: true,
      tokensUsed: true,
      createdAt: true,
    },
  });

  return NextResponse.json(revisions);
}
