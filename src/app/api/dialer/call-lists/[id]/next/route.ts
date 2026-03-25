import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

/**
 * Get the next pending contact in a call list.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const list = await prisma.callList.findFirst({
      where: { id, userId },
    });

    if (!list) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const nextEntry = await prisma.callListEntry.findFirst({
      where: {
        callListId: id,
        status: "pending",
      },
      orderBy: { position: "asc" },
    });

    if (!nextEntry) {
      // Mark list as completed
      await prisma.callList.update({
        where: { id },
        data: { status: "completed" },
      });
      return NextResponse.json({ done: true, entry: null });
    }

    // Fetch the contact
    const contact = await prisma.contact.findUnique({
      where: { id: nextEntry.contactId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        type: true,
        notes: true,
        lastContactedAt: true,
        leadScore: { select: { score: true, grade: true } },
      },
    });

    // Count progress
    const total = await prisma.callListEntry.count({ where: { callListId: id } });
    const completed = await prisma.callListEntry.count({
      where: { callListId: id, status: "completed" },
    });

    return NextResponse.json({
      done: false,
      entry: { ...nextEntry, contact },
      progress: { total, completed, remaining: total - completed },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
