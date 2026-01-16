// ============================================================================
// COLONY LAM - Audit
// Persists complete audit trail of all LAM operations
// ============================================================================

import { prisma } from "@/lib/prisma";
import type { ActionPlan } from "./actionSchema";
import type { ExecutionResult } from "./runtime";
import type { VerificationResult } from "./verifier";

// ============================================================================
// Types
// ============================================================================

export interface AuditRecord {
  run_id: string;
  user_id: string;
  message: string;
  plan: ActionPlan;
  execution_result?: ExecutionResult;
  verification_result?: VerificationResult;
  user_summary: string;
  status: "pending" | "executing" | "completed" | "failed" | "approval_required";
  created_at: Date;
  completed_at?: Date;
}

export interface RecordRunInput {
  user_id: string;
  message: string;
  plan: ActionPlan;
}

export interface UpdateRunInput {
  run_id: string;
  execution_result?: ExecutionResult;
  verification_result?: VerificationResult;
  status?: AuditRecord["status"];
  user_summary?: string;
}

// ============================================================================
// Audit Functions
// ============================================================================

/**
 * Create a new LAM run record
 */
export async function recordRun(input: RecordRunInput): Promise<string> {
  const run = await prisma.lamRun.create({
    data: {
      userId: input.user_id,
      message: input.message,
      planJson: input.plan as object,
      status: input.plan.follow_up_question ? "pending" : "executing",
      userSummary: input.plan.user_summary,
    },
  });

  // Record individual actions
  for (const action of input.plan.actions) {
    await prisma.lamAction.create({
      data: {
        runId: run.id,
        actionId: action.action_id,
        actionType: action.type,
        idempotencyKey: action.idempotency_key,
        riskTier: action.risk_tier,
        payloadJson: action as object,
        status: action.requires_approval ? "pending" : "pending",
      },
    });
  }

  return run.id;
}

/**
 * Update a LAM run with execution and verification results
 */
export async function updateRun(input: UpdateRunInput): Promise<void> {
  const updateData: {
    status?: string;
    resultJson?: object;
    verifyJson?: object;
    userSummary?: string;
    completedAt?: Date;
  } = {};

  if (input.execution_result) {
    updateData.resultJson = input.execution_result as object;
  }

  if (input.verification_result) {
    updateData.verifyJson = input.verification_result as object;
  }

  if (input.status) {
    updateData.status = input.status;
    if (input.status === "completed" || input.status === "failed") {
      updateData.completedAt = new Date();
    }
  }

  if (input.user_summary) {
    updateData.userSummary = input.user_summary;
  }

  await prisma.lamRun.update({
    where: { id: input.run_id },
    data: updateData,
  });

  // Update individual action statuses
  if (input.execution_result) {
    for (const result of input.execution_result.results) {
      await prisma.lamAction.updateMany({
        where: {
          runId: input.run_id,
          actionId: result.action_id,
        },
        data: {
          status:
            result.status === "success"
              ? "executed"
              : result.status === "approval_required"
              ? "pending"
              : "failed",
          resultJson: result as object,
          executedAt: result.status === "success" ? new Date() : null,
        },
      });
    }
  }
}

/**
 * Get a LAM run by ID
 */
export async function getRun(runId: string): Promise<AuditRecord | null> {
  const run = await prisma.lamRun.findUnique({
    where: { id: runId },
    include: {
      actions: true,
    },
  });

  if (!run) {
    return null;
  }

  return {
    run_id: run.id,
    user_id: run.userId,
    message: run.message,
    plan: run.planJson as unknown as ActionPlan,
    execution_result: run.resultJson as unknown as ExecutionResult | undefined,
    verification_result: run.verifyJson as unknown as VerificationResult | undefined,
    user_summary: run.userSummary || "",
    status: run.status as AuditRecord["status"],
    created_at: run.createdAt,
    completed_at: run.completedAt || undefined,
  };
}

/**
 * Get recent LAM runs for a user
 */
export async function getRecentRuns(
  userId: string,
  limit: number = 20
): Promise<AuditRecord[]> {
  const runs = await prisma.lamRun.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return runs.map((run) => ({
    run_id: run.id,
    user_id: run.userId,
    message: run.message,
    plan: run.planJson as unknown as ActionPlan,
    execution_result: run.resultJson as unknown as ExecutionResult | undefined,
    verification_result: run.verifyJson as unknown as VerificationResult | undefined,
    user_summary: run.userSummary || "",
    status: run.status as AuditRecord["status"],
    created_at: run.createdAt,
    completed_at: run.completedAt || undefined,
  }));
}

/**
 * Get runs pending approval
 */
export async function getPendingApprovalRuns(
  userId: string
): Promise<AuditRecord[]> {
  const runs = await prisma.lamRun.findMany({
    where: {
      userId,
      status: "approval_required",
    },
    orderBy: { createdAt: "desc" },
  });

  return runs.map((run) => ({
    run_id: run.id,
    user_id: run.userId,
    message: run.message,
    plan: run.planJson as unknown as ActionPlan,
    execution_result: run.resultJson as unknown as ExecutionResult | undefined,
    verification_result: run.verifyJson as unknown as VerificationResult | undefined,
    user_summary: run.userSummary || "",
    status: run.status as AuditRecord["status"],
    created_at: run.createdAt,
    completed_at: run.completedAt || undefined,
  }));
}

/**
 * Get audit log for a specific entity
 */
export async function getEntityAuditLog(
  entityType: string,
  entityId: string
): Promise<{
  changes: Array<{
    run_id: string;
    action_id: string;
    operation: string;
    before: unknown;
    after: unknown;
    created_at: Date;
    undone: boolean;
  }>;
}> {
  const changes = await prisma.lamChangeLog.findMany({
    where: {
      entityType,
      entityId,
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    changes: changes.map((change) => ({
      run_id: change.runId,
      action_id: change.actionId,
      operation: change.operation,
      before: change.beforeJson,
      after: change.afterJson,
      created_at: change.createdAt,
      undone: change.undone,
    })),
  };
}

