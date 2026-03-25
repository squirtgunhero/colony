import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const list = await prisma.callList.findFirst({
      where: { id, userId },
      include: {
        entries: {
          orderBy: { position: "asc" },
          include: {
            // We can't include contact directly since there's no relation defined
            // Instead, we'll fetch contacts separately
          },
        },
      },
    });

    if (!list) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Fetch contacts for all entries
    const contactIds = list.entries.map((e) => e.contactId);
    const contacts = await prisma.contact.findMany({
      where: { id: { in: contactIds } },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        type: true,
        leadScore: { select: { score: true, grade: true } },
      },
    });

    const contactMap = new Map(contacts.map((c) => [c.id, c]));
    const entriesWithContacts = list.entries.map((entry) => ({
      ...entry,
      contact: contactMap.get(entry.contactId) || null,
    }));

    return NextResponse.json({
      ...list,
      entries: entriesWithContacts,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const body = await request.json();

    const list = await prisma.callList.findFirst({
      where: { id, userId },
    });

    if (!list) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.callList.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status && { status: body.status }),
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    await prisma.callList.updateMany({
      where: { id, userId },
      data: { status: "archived" },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to archive" }, { status: 500 });
  }
}
