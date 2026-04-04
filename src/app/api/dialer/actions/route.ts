import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { executeCallAction } from "@/lib/dialer/action-executor";

/**
 * GET /api/dialer/actions
 * Returns pending (not completed) CallActions for the current user,
 * grouped with their associated call and contact info.
 */
export async function GET() {
  try {
    const userId = await requireUserId();

    const actions = await prisma.callAction.findMany({
      where: {
        userId,
        completed: false,
      },
      include: {
        call: {
          select: {
            id: true,
            toNumber: true,
            aiSummary: true,
            createdAt: true,
            contact: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: [
        { dueDate: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ actions });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Dialer Actions GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/dialer/actions
 * Executes a single CallAction via the action executor.
 * Body: { actionId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const { actionId } = body as { actionId: string };

    if (!actionId) {
      return NextResponse.json({ error: "actionId is required" }, { status: 400 });
    }

    const action = await prisma.callAction.findFirst({
      where: { id: actionId, userId },
    });

    if (!action) {
      return NextResponse.json({ error: "Action not found" }, { status: 404 });
    }

    if (action.completed) {
      return NextResponse.json({ error: "Action already completed" }, { status: 400 });
    }

    const result = await executeCallAction(action);

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Dialer Actions POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/dialer/actions
 * Dismisses an action (marks as completed without executing).
 * Body: { actionId: string, action: "dismiss" }
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const { actionId, action: patchAction } = body as { actionId: string; action: string };

    if (!actionId || patchAction !== "dismiss") {
      return NextResponse.json(
        { error: "actionId and action: 'dismiss' are required" },
        { status: 400 }
      );
    }

    const callAction = await prisma.callAction.findFirst({
      where: { id: actionId, userId },
    });

    if (!callAction) {
      return NextResponse.json({ error: "Action not found" }, { status: 404 });
    }

    if (callAction.completed) {
      return NextResponse.json({ error: "Action already completed" }, { status: 400 });
    }

    await prisma.callAction.update({
      where: { id: actionId },
      data: {
        completed: true,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Dialer Actions PATCH] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
