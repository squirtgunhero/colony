import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

/**
 * GET /api/workflows
 * List all workflows. Query: ?status=active
 */
export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const workflows = await prisma.workflow.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
      },
      include: {
        _count: { select: { runs: true } },
        runs: {
          take: 5,
          orderBy: { startedAt: "desc" },
          select: { id: true, status: true, startedAt: true, completedAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ workflows });
  } catch (error) {
    console.error("[Workflows]", error);
    return NextResponse.json({ error: "Failed to fetch workflows" }, { status: 500 });
  }
}

/**
 * POST /api/workflows
 * Create a new workflow.
 */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();

    const workflow = await prisma.workflow.create({
      data: {
        userId,
        name: body.name,
        description: body.description,
        trigger: body.trigger,
        steps: body.steps,
        status: body.status || "active",
      },
    });

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error("[Workflows]", error);
    return NextResponse.json({ error: "Failed to create workflow" }, { status: 500 });
  }
}

/**
 * PUT /api/workflows
 * Update a workflow. Body: { id, ...fields }
 */
export async function PUT(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: "Workflow ID required" }, { status: 400 });
    }

    const existing = await prisma.workflow.findFirst({
      where: { id: body.id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    const { id, ...updates } = body;
    const workflow = await prisma.workflow.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error("[Workflows]", error);
    return NextResponse.json({ error: "Failed to update workflow" }, { status: 500 });
  }
}

/**
 * DELETE /api/workflows
 * Delete a workflow. Body: { id }
 */
export async function DELETE(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: "Workflow ID required" }, { status: 400 });
    }

    const existing = await prisma.workflow.findFirst({
      where: { id: body.id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    await prisma.workflow.delete({ where: { id: body.id } });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[Workflows]", error);
    return NextResponse.json({ error: "Failed to delete workflow" }, { status: 500 });
  }
}
