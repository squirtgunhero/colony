// ============================================================================
// /api/marketing/email — CRUD for email campaigns
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { prisma } from "@/lib/prisma";

// GET — list email campaigns
export async function GET() {
  try {
    const userId = await requireUserId();
    const campaigns = await prisma.emailCampaign.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { steps: true } } },
    });
    return NextResponse.json({ campaigns });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — create email campaign
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const { name, type, subject, bodyHtml, bodyText, fromName } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const campaign = await prisma.emailCampaign.create({
      data: {
        userId,
        name,
        type: type || "one_time",
        subject: subject || null,
        bodyHtml: bodyHtml || null,
        bodyText: bodyText || null,
        fromName: fromName || null,
      },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
