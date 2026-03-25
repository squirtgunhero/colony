import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

export async function GET() {
  try {
    const userId = await requireUserId();
    const lists = await prisma.callList.findMany({
      where: { userId, status: { not: "archived" } },
      include: {
        _count: { select: { entries: true } },
        entries: {
          where: { status: "completed" },
          select: { id: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const result = lists.map((list) => ({
      ...list,
      totalEntries: list._count.entries,
      completedEntries: list.entries.length,
      entries: undefined,
      _count: undefined,
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const { name, description, contactIds, filterJson, sortOrder } = body;

    const list = await prisma.callList.create({
      data: {
        userId,
        name,
        description: description || null,
        filterJson: filterJson || null,
        sortOrder: sortOrder || "lead_score_desc",
      },
    });

    // Add contacts to the list if provided
    if (contactIds && contactIds.length > 0) {
      await prisma.callListEntry.createMany({
        data: contactIds.map((contactId: string, index: number) => ({
          callListId: list.id,
          contactId,
          position: index,
        })),
      });
    }

    return NextResponse.json(list);
  } catch {
    return NextResponse.json({ error: "Failed to create call list" }, { status: 500 });
  }
}
