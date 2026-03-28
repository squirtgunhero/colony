// ============================================================================
// COLONY LAM - Runtime
// Executes validated action plans with risk tier enforcement
//
// Refactored: Executor implementations split into domain modules under
// ./executors/. This file is the orchestration layer only.
// ============================================================================

import { prisma } from "@/lib/prisma";
import type { Action, ActionPlan } from "./actionSchema";
import { validateAction } from "./actionSchema";
import { checkIdempotency, recordIdempotency } from "./helpers";
import { executors } from "./executors";

// Re-export types so existing imports from "./runtime" continue to work
export type {
  ExecutionContext,
  ActionResult,
  ExecutionResult,
} from "./types";

import type { ExecutionContext, ActionResult, ExecutionResult } from "./types";

// ============================================================================
// Main Executor
// ============================================================================

async function executeAction(
  action: Action,
  ctx: ExecutionContext
): Promise<ActionResult> {
  // Sanitize payload.type for lead/contact actions — LLM sometimes picks invalid values
  if (
    (action.type === "lead.create" || action.type === "lead.update") &&
    action.payload &&
    typeof action.payload === "object" &&
    "type" in action.payload
  ) {
    const validTypes = ["lead", "client", "agent", "vendor"];
    const p = action.payload as Record<string, unknown>;
    if (p.type && !validTypes.includes(p.type as string)) {
      p.type = "lead";
    }
    // Also check nested patch.type for lead.update
    if ("patch" in p && p.patch && typeof p.patch === "object") {
      const patch = p.patch as Record<string, unknown>;
      if (patch.type && !validTypes.includes(patch.type as string)) {
        patch.type = "lead";
      }
    }
  }

  // Validate action
  const validation = validateAction(action);
  if (!validation.success) {
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "failed",
      error: `Validation failed: ${validation.error.message}`,
    };
  }

  // Check idempotency
  const idempotencyCheck = await checkIdempotency(action.idempotency_key);
  if (idempotencyCheck.exists) {
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: idempotencyCheck.result,
    };
  }

  // Find executor
  const executor = executors[action.type];
  if (!executor) {
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "failed",
      error: `No executor for action type: ${action.type}`,
    };
  }

  // Execute
  try {
    const result = await executor(action, ctx);

    // Record idempotency key
    if (result.status === "success") {
      await recordIdempotency(action.idempotency_key, ctx.run_id, result.data);
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "failed",
      error: message,
    };
  }
}

// ============================================================================
// Plan Execution
// ============================================================================

/**
 * Execute an action plan with risk tier enforcement
 */
export async function executePlan(
  plan: ActionPlan,
  ctx: ExecutionContext
): Promise<ExecutionResult> {
  const results: ActionResult[] = [];
  let actionsExecuted = 0;
  let actionsSkipped = 0;
  let actionsFailed = 0;
  let actionsPendingApproval = 0;
  const pendingTier2Actions: Action[] = [];

  // Group actions by risk tier
  const tier0Actions = plan.actions.filter((a) => a.risk_tier === 0);
  const tier1Actions = plan.actions.filter((a) => a.risk_tier === 1);
  const tier2Actions = plan.actions.filter((a) => a.risk_tier === 2);

  // Execute Tier 0 (read-only) actions
  for (const action of tier0Actions) {
    if (ctx.dry_run) {
      results.push({
        action_id: action.action_id,
        action_type: action.type,
        status: "skipped",
      });
      actionsSkipped++;
      continue;
    }

    const result = await executeAction(action, ctx);
    results.push(result);
    if (result.status === "success") {
      actionsExecuted++;
    } else if (result.status === "failed") {
      actionsFailed++;
    }
  }

  // Execute Tier 1 (mutations) actions
  for (const action of tier1Actions) {
    if (ctx.dry_run) {
      results.push({
        action_id: action.action_id,
        action_type: action.type,
        status: "skipped",
      });
      actionsSkipped++;
      continue;
    }

    const result = await executeAction(action, ctx);
    results.push(result);
    if (result.status === "success") {
      actionsExecuted++;
    } else if (result.status === "failed") {
      actionsFailed++;
    }
  }

  // Tier 2 actions require approval - don't execute
  for (const action of tier2Actions) {
    pendingTier2Actions.push(action);
    results.push({
      action_id: action.action_id,
      action_type: action.type,
      status: "approval_required",
    });
    actionsPendingApproval++;
  }

  // Determine overall status
  let status: ExecutionResult["status"];
  if (actionsPendingApproval > 0) {
    status = "approval_required";
  } else if (actionsFailed > 0 && actionsExecuted > 0) {
    status = "partial";
  } else if (actionsFailed > 0) {
    status = "failed";
  } else {
    status = "completed";
  }

  // Generate user summary
  const summaryParts: string[] = [];
  if (actionsExecuted > 0) {
    summaryParts.push(`${actionsExecuted} action(s) completed`);
  }
  if (actionsFailed > 0) {
    summaryParts.push(`${actionsFailed} action(s) failed`);
  }
  if (actionsPendingApproval > 0) {
    summaryParts.push(`${actionsPendingApproval} action(s) pending approval`);
  }

  return {
    run_id: ctx.run_id,
    status,
    actions_executed: actionsExecuted,
    actions_skipped: actionsSkipped,
    actions_failed: actionsFailed,
    actions_pending_approval: actionsPendingApproval,
    results,
    user_summary:
      summaryParts.join(", ") || "No actions executed",
    pending_tier2_actions:
      pendingTier2Actions.length > 0 ? pendingTier2Actions : undefined,
  };
}

// ============================================================================
// Approved Action Execution
// ============================================================================

/**
 * Execute pending Tier 2 actions after approval
 */
export async function executeApprovedActions(
  runId: string,
  userId: string
): Promise<ExecutionResult> {
  // Get the run with pending actions
  const run = await prisma.lamRun.findUnique({
    where: { id: runId },
    include: {
      actions: {
        where: { status: "pending", riskTier: 2 },
      },
    },
  });

  if (!run) {
    return {
      run_id: runId,
      status: "failed",
      actions_executed: 0,
      actions_skipped: 0,
      actions_failed: 1,
      actions_pending_approval: 0,
      results: [],
      user_summary: "Run not found",
    };
  }

  // If no pending tier-2 actions found, check if there are any actions at all
  if (run.actions.length === 0) {
    const allActions = await prisma.lamAction.findMany({
      where: { runId },
      select: { id: true, actionType: true, status: true, riskTier: true },
    });
    console.error(
      `[LAM] executeApprovedActions: No pending tier-2 actions for run ${runId}. All actions:`,
      JSON.stringify(allActions)
    );
    return {
      run_id: runId,
      status: "completed",
      actions_executed: 0,
      actions_skipped: 0,
      actions_failed: 0,
      actions_pending_approval: 0,
      results: [],
      user_summary: `No pending actions found. Actions in this run: ${allActions.map((a) => `${a.actionType}(${a.status})`).join(", ") || "none"}`,
    };
  }

  const ctx: ExecutionContext = {
    user_id: userId,
    run_id: runId,
  };

  const results: ActionResult[] = [];
  let actionsExecuted = 0;
  let actionsFailed = 0;

  for (const lamAction of run.actions) {
    const action = lamAction.payloadJson as unknown as Action;
    const result = await executeAction(action, ctx);
    results.push(result);

    // Update action status in DB
    await prisma.lamAction.update({
      where: { id: lamAction.id },
      data: {
        status: result.status === "success" ? "executed" : "failed",
        resultJson: result as object,
        executedAt: new Date(),
      },
    });

    if (result.status === "success") {
      actionsExecuted++;
    } else {
      actionsFailed++;
    }
  }

  // Update run status
  await prisma.lamRun.update({
    where: { id: runId },
    data: {
      status: actionsFailed > 0 ? "failed" : "completed",
      completedAt: new Date(),
    },
  });

  return {
    run_id: runId,
    status: actionsFailed > 0 ? "partial" : "completed",
    actions_executed: actionsExecuted,
    actions_skipped: 0,
    actions_failed: actionsFailed,
    actions_pending_approval: 0,
    results,
    user_summary: `Executed ${actionsExecuted} approved action(s)`,
  };
}
