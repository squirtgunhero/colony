// ============================================================================
// POST /api/lam/run
// Execute a LAM action from natural language
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { runLam } from "@/lam";
import { checkRateLimit, recordUsage, LAM_LIMITS } from "@/lam/rateLimit";
import { createClient } from "@/lib/supabase/server";

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

    // Check rate limits BEFORE making API call
    const rateCheck = await checkRateLimit(user.id);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { 
          error: rateCheck.reason,
          retry_after: rateCheck.retryAfter,
          usage: rateCheck.usage,
        },
        { status: 429 }
      );
    }

    // Parse request body (simple validation, no Zod)
    const body = await request.json();
    
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const recent_context = Array.isArray(body.recent_context) ? body.recent_context : undefined;
    const dry_run = body.dry_run === true;

    // Execute LAM run
    const result = await runLam({
      message,
      user_id: user.id,
      recent_context: recent_context?.map((ctx: { entity_type: string; entity_id: string; entity_name?: string; last_touched?: string }) => ({
        ...ctx,
        entity_type: ctx.entity_type as "contact" | "deal" | "task" | "property",
        last_touched: ctx.last_touched
          ? new Date(ctx.last_touched)
          : new Date(),
      })),
      dry_run,
    });

    // Record usage AFTER successful API call
    recordUsage(user.id, LAM_LIMITS.ESTIMATED_COST_PER_REQUEST);

    return NextResponse.json({
      success: true,
      run_id: result.run_id,
      plan: {
        intent: result.plan.intent,
        confidence: result.plan.confidence,
        actions: result.plan.actions.map((a) => ({
          type: a.type,
          action_id: a.action_id,
          risk_tier: a.risk_tier,
          requires_approval: a.requires_approval,
        })),
        user_summary: result.plan.user_summary,
        follow_up_question: result.plan.follow_up_question,
      },
      execution_result: result.execution_result
        ? {
            status: result.execution_result.status,
            actions_executed: result.execution_result.actions_executed,
            actions_failed: result.execution_result.actions_failed,
            actions_pending_approval:
              result.execution_result.actions_pending_approval,
            user_summary: result.execution_result.user_summary,
          }
        : null,
      verification_result: result.verification_result
        ? {
            status: result.verification_result.status,
            verified_count: result.verification_result.verified_count,
            failed_count: result.verification_result.failed_count,
          }
        : null,
      response: result.response,
    });
  } catch (error) {
    console.error("LAM run error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

