// ============================================================================
// COLONY LAM - Helper Functions
// Shared utilities used by executor modules
// ============================================================================

import { prisma } from "@/lib/prisma";

// ============================================================================
// Idempotency Handling
// ============================================================================

export async function checkIdempotency(
  idempotencyKey: string
): Promise<{ exists: boolean; result?: unknown }> {
  const existing = await prisma.lamIdempotencyKey.findUnique({
    where: { key: idempotencyKey },
  });

  if (existing) {
    return { exists: true, result: existing.resultJson };
  }
  return { exists: false };
}

export async function recordIdempotency(
  idempotencyKey: string,
  runId: string,
  result: unknown
): Promise<void> {
  await prisma.lamIdempotencyKey.create({
    data: {
      key: idempotencyKey,
      runId,
      resultJson: result as object,
    },
  });
}

// ============================================================================
// Change Log Recording
// ============================================================================

export async function recordChange(
  runId: string,
  actionId: string,
  entityType: string,
  entityId: string,
  operation: "create" | "update" | "delete",
  before: unknown,
  after: unknown
): Promise<void> {
  await prisma.lamChangeLog.create({
    data: {
      runId,
      actionId,
      entityType,
      entityId,
      operation,
      beforeJson: before === null ? undefined : (before as object),
      afterJson: after === null ? undefined : (after as object),
    },
  });
}

// ============================================================================
// Team Lookup Helper
// ============================================================================

export async function getUserActiveTeamId(userId: string): Promise<string | null> {
  const membership = await prisma.teamMember.findFirst({
    where: { userId },
    orderBy: { joinedAt: "desc" },
    select: { teamId: true },
  });
  return membership?.teamId ?? null;
}
