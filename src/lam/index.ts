// ============================================================================
// COLONY LAM - Large Action Model
// Main entry point and orchestration
// ============================================================================

export * from "./actionSchema";
export * from "./llm";
// export * from "./llmParser"; // Disabled - using manual parsing in planner
export * from "./planner";
export * from "./runtime";
export * from "./verifier";
export * from "./audit";
export * from "./undo";
export * from "./rateLimit";

import { planFromMessage, type PlannerInput } from "./planner";
import { executePlan, type ExecutionContext } from "./runtime";
import { verify } from "./verifier";
import { recordRun, updateRun, getRun } from "./audit";
import type { ActionPlan } from "./actionSchema";
import type { ExecutionResult } from "./runtime";
import type { VerificationResult } from "./verifier";

// ============================================================================
// Orchestrated LAM Run
// ============================================================================

export interface LamRunInput {
  message: string;
  user_id: string;
  recent_context?: Array<{
    entity_type: "contact" | "deal" | "task" | "property";
    entity_id: string;
    entity_name?: string;
    last_touched: Date;
  }>;
  permissions?: string[];
  dry_run?: boolean;
}

export interface LamRunResult {
  run_id: string;
  plan: ActionPlan;
  execution_result: ExecutionResult | null;
  verification_result: VerificationResult | null;
  response: {
    message: string;
    follow_up_question: string | null;
    requires_approval: boolean;
    can_undo: boolean;
  };
}

/**
 * Execute a complete LAM run: plan -> execute -> verify -> audit
 */
export async function runLam(input: LamRunInput): Promise<LamRunResult> {
  // Step 1: Plan
  const plannerInput: PlannerInput = {
    user_message: input.message,
    user_id: input.user_id,
    recent_context: input.recent_context,
    permissions: input.permissions,
  };

  const planResult = await planFromMessage(plannerInput);

  if (!planResult.success) {
    throw new Error(planResult.error);
  }

  const plan = planResult.plan;

  // Step 2: Record the run
  const runId = await recordRun({
    user_id: input.user_id,
    message: input.message,
    plan,
  });

  // If there's a follow-up question, don't execute
  if (plan.follow_up_question) {
    return {
      run_id: runId,
      plan,
      execution_result: null,
      verification_result: null,
      response: {
        message: plan.user_summary,
        follow_up_question: plan.follow_up_question,
        requires_approval: false,
        can_undo: false,
      },
    };
  }

  // Step 3: Execute
  const ctx: ExecutionContext = {
    user_id: input.user_id,
    run_id: runId,
    dry_run: input.dry_run,
  };

  const executionResult = await executePlan(plan, ctx);

  // Step 4: Verify
  const verificationResult = await verify(plan, executionResult);

  // Step 5: Update audit record
  await updateRun({
    run_id: runId,
    execution_result: executionResult,
    verification_result: verificationResult,
    status:
      executionResult.status === "approval_required"
        ? "approval_required"
        : executionResult.status === "completed"
        ? "completed"
        : "failed",
    user_summary: buildUserSummary(plan, executionResult, verificationResult),
  });

  return {
    run_id: runId,
    plan,
    execution_result: executionResult,
    verification_result: verificationResult,
    response: {
      message: buildUserSummary(plan, executionResult, verificationResult),
      follow_up_question: null,
      requires_approval: executionResult.status === "approval_required",
      can_undo: executionResult.actions_executed > 0,
    },
  };
}

/**
 * Build a user-friendly summary of the run
 */
function buildUserSummary(
  plan: ActionPlan,
  execution: ExecutionResult,
  _verification: VerificationResult
): string {
  const parts: string[] = [];

  if (execution.actions_executed > 0) {
    parts.push(`✓ ${execution.actions_executed} action(s) completed`);
  }

  if (execution.actions_failed > 0) {
    parts.push(`✗ ${execution.actions_failed} action(s) failed`);
  }

  if (execution.actions_pending_approval > 0) {
    parts.push(
      `⏳ ${execution.actions_pending_approval} action(s) awaiting approval`
    );
  }

  if (parts.length === 0) {
    return plan.user_summary;
  }

  return `${plan.user_summary}\n\n${parts.join("\n")}`;
}

/**
 * Continue a run after providing additional info (for follow-up questions)
 */
export async function continueLamRun(
  runId: string,
  additionalMessage: string,
  userId: string
): Promise<LamRunResult> {
  const existingRun = await getRun(runId);
  if (!existingRun) {
    throw new Error("Run not found");
  }

  if (existingRun.user_id !== userId) {
    throw new Error("Permission denied");
  }

  // Create a new run with combined context
  const combinedMessage = `${existingRun.message}\n\nUser response: ${additionalMessage}`;

  return runLam({
    message: combinedMessage,
    user_id: userId,
  });
}

