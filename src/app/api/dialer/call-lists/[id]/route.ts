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
            contact: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                type: true,
                leadScore: true,
                leadGrade: true,
              },
            },
          },
        },
      },
    });

    if (!list) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(list);
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
