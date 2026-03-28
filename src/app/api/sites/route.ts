import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

// GET /api/sites — list user's sites
export async function GET() {
  const userId = await requireUserId();

  const sites = await prisma.landingPage.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      siteType: true,
      views: true,
      leads: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(sites);
}

// POST /api/sites — create a new site
export async function POST(request: Request) {
  const userId = await requireUserId();
  const { name, prompt } = await request.json();

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Generate a unique slug
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  const site = await prisma.landingPage.create({
    data: {
      userId,
      name,
      slug,
      status: "draft",
      contentJson: {},
      prompt: prompt ?? null,
      siteType: "landing_page",
    },
  });

  return NextResponse.json(site, { status: 201 });
}
