import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const search = searchParams.get("search") || "";

    const where = {
      userId,
      ...(search ? { phone: { contains: search } } : {}),
    };

    const [entries, total] = await Promise.all([
      prisma.dNCEntry.findMany({
        where,
        orderBy: { addedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.dNCEntry.count({ where }),
    ]);

    return NextResponse.json({
      entries,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const { phone, reason, source } = await request.json();

    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const cleaned = phone.replace(/[^\d+]/g, "");

    const entry = await prisma.dNCEntry.upsert({
      where: { userId_phone: { userId, phone: cleaned } },
      update: { reason: reason || "manual", source: source || "manual" },
      create: {
        userId,
        phone: cleaned,
        reason: reason || "manual",
        source: source || "manual",
      },
    });

    return NextResponse.json(entry);
  } catch {
    return NextResponse.json({ error: "Failed to add DNC entry" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const { phone } = await request.json();

    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    await prisma.dNCEntry.deleteMany({ where: { userId, phone } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to remove DNC entry" }, { status: 500 });
  }
}
