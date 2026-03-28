import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

// GET /api/sequences — list sequences with stats
export async function GET() {
  const userId = await requireUserId();

  const sequences = await prisma.emailSequence.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { enrollments: true } },
      enrollments: {
        select: { status: true },
      },
    },
  });

  const result = sequences.map((s) => {
    const statusCounts: Record<string, number> = {};
    for (const e of s.enrollments) {
      statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
    }
    return {
      id: s.id,
      name: s.name,
      description: s.description,
      steps: s.steps,
      status: s.status,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      enrollmentCount: s._count.enrollments,
      enrollmentsByStatus: statusCounts,
    };
  });

  return NextResponse.json(result);
}

// POST /api/sequences — create or update a sequence
export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  const body = await req.json();

  if (body.id) {
    // Update
    const sequence = await prisma.emailSequence.update({
      where: { id: body.id },
      data: {
        name: body.name,
        description: body.description,
        steps: body.steps,
        status: body.status,
      },
    });
    return NextResponse.json(sequence);
  }

  // Create
  const sequence = await prisma.emailSequence.create({
    data: {
      userId,
      name: body.name,
      description: body.description || null,
      steps: body.steps || [],
      status: body.status || "draft",
    },
  });

  return NextResponse.json(sequence, { status: 201 });
}

// DELETE /api/sequences?id=xxx
export async function DELETE(req: NextRequest) {
  await requireUserId();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await prisma.emailSequence.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
