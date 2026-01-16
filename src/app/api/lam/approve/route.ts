// ============================================================================
// POST /api/lam/approve
// Approve and execute pending Tier 2 actions
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { executeApprovedActions } from "@/lam/runtime";
import { verify } from "@/lam/verifier";
import { updateRun, getRun } from "@/lam/audit";
import { createClient } from "@/lib/supabase/server";

const RequestSchema = z.object({
  run_id: z.string().min(1, "Run ID is required"),
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

    // Get the run
    const run = await getRun(run_id);
    if (!run) {
      return NextResponse.json(
        { error: "Run not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (run.user_id !== user.id) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    // Check if run is pending approval
    if (run.status !== "approval_required") {
      return NextResponse.json(
        { error: "Run is not pending approval", status: run.status },
        { status: 400 }
      );
    }

    // Execute approved actions
    const executionResult = await executeApprovedActions(run_id, user.id);

    // Verify the results
    const verificationResult = await verify(run.plan, executionResult);

    // Update the run
    await updateRun({
      run_id,
      execution_result: executionResult,
      verification_result: verificationResult,
      status: executionResult.status === "completed" ? "completed" : "failed",
      user_summary: `Approved actions executed. ${executionResult.actions_executed} completed, ${executionResult.actions_failed} failed.`,
    });

    return NextResponse.json({
      success: true,
      run_id,
      execution_result: {
        status: executionResult.status,
        actions_executed: executionResult.actions_executed,
        actions_failed: executionResult.actions_failed,
        user_summary: executionResult.user_summary,
      },
      verification_result: {
        status: verificationResult.status,
        verified_count: verificationResult.verified_count,
        failed_count: verificationResult.failed_count,
      },
    });
  } catch (error) {
    console.error("LAM approve error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

