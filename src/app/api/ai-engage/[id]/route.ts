import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET — single engagement with full message history
export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const engagement = await prisma.aIEngagement.findFirst({
    where: { id, userId: user.id },
    include: {
      contact: { select: { id: true, name: true, email: true, phone: true, source: true, type: true, tags: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!engagement) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(engagement);
}

// PATCH — update engagement (pause, change objective, etc.)
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { status, aiObjective } = body;

  const engagement = await prisma.aIEngagement.findFirst({
    where: { id, userId: user.id },
  });
  if (!engagement) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  if (status) updateData.status = status;
  if (aiObjective) updateData.aiObjective = aiObjective;

  if (status === "active" && !engagement.nextFollowUp) {
    updateData.nextFollowUp = new Date();
  }

  const updated = await prisma.aIEngagement.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}

// DELETE — remove engagement
export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const engagement = await prisma.aIEngagement.findFirst({
    where: { id, userId: user.id },
  });
  if (!engagement) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.aIEngagement.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
