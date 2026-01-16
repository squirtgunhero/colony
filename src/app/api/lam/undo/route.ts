// ============================================================================
// POST /api/lam/undo
// Undo the last run or a specific run
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { undoRun, undoLastRun, canUndo } from "@/lam/undo";
import { createClient } from "@/lib/supabase/server";

const RequestSchema = z.object({
  run_id: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = RequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { run_id } = validation.data;

    let result;

    if (run_id) {
      // Check if can undo
      const check = await canUndo(run_id, user.id);
      if (!check.can_undo) {
        return NextResponse.json(
          { error: check.reason || "Cannot undo this run" },
          { status: 400 }
        );
      }

      // Undo specific run
      result = await undoRun(run_id, user.id);
    } else {
      // Undo last run
      result = await undoLastRun(user.id);
    }

    if (!result.success && result.errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          run_id: result.run_id,
          errors: result.errors,
          changes_reverted: result.changes_reverted,
        },
        { status: result.run_id ? 200 : 400 }
      );
    }

    return NextResponse.json({
      success: result.success,
      run_id: result.run_id,
      changes_reverted: result.changes_reverted,
      details: result.details.map((d) => ({
        entity_type: d.entity_type,
        entity_id: d.entity_id,
        operation: d.operation,
        status: d.status,
      })),
    });
  } catch (error) {
    console.error("LAM undo error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

