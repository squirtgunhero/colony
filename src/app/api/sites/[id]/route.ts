import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

// GET /api/sites/[id] — get site with current HTML
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireUserId();
  const { id } = await params;

  const site = await prisma.landingPage.findFirst({
    where: { id, userId },
    include: {
      revisions: {
        orderBy: { version: "desc" },
        take: 1,
        select: { version: true, tokensUsed: true },
      },
    },
  });

  if (!site) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(site);
}

// PATCH /api/sites/[id] — update site metadata
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireUserId();
  const { id } = await params;
  const body = await request.json();

  const site = await prisma.landingPage.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!site) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowedFields: Record<string, boolean> = {
    name: true,
    slug: true,
    status: true,
    siteType: true,
  };

  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (allowedFields[key]) data[key] = value;
  }

  const updated = await prisma.landingPage.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}

// DELETE /api/sites/[id] — delete site
export async function DELETE(
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

  await prisma.landingPage.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
