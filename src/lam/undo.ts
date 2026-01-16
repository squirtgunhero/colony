// ============================================================================
// COLONY LAM - Undo
// Implements undo functionality using change log
// ============================================================================

import { prisma } from "@/lib/prisma";

// ============================================================================
// Types
// ============================================================================

export interface UndoResult {
  success: boolean;
  run_id: string;
  changes_reverted: number;
  errors: string[];
  details: UndoDetail[];
}

export interface UndoDetail {
  change_id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  status: "reverted" | "failed" | "skipped";
  error?: string;
}

// ============================================================================
// Undo Implementation
// ============================================================================

/**
 * Undo all changes from a specific run
 */
export async function undoRun(runId: string, userId: string): Promise<UndoResult> {
  // Get the run
  const run = await prisma.lamRun.findUnique({
    where: { id: runId },
    include: {
      changeLogs: {
        where: { undone: false },
        orderBy: { createdAt: "desc" }, // Undo in reverse order
      },
      actions: true,
    },
  });

  if (!run) {
    return {
      success: false,
      run_id: runId,
      changes_reverted: 0,
      errors: ["Run not found"],
      details: [],
    };
  }

  // Verify user owns this run
  if (run.userId !== userId) {
    return {
      success: false,
      run_id: runId,
      changes_reverted: 0,
      errors: ["Permission denied: you can only undo your own runs"],
      details: [],
    };
  }

  // Check if any actions are Tier 2 (require explicit approval for undo)
  const hasTier2 = run.actions.some((a) => a.riskTier === 2);
  if (hasTier2) {
    return {
      success: false,
      run_id: runId,
      changes_reverted: 0,
      errors: ["Cannot auto-undo runs with Tier 2 actions. External communications cannot be unsent."],
      details: [],
    };
  }

  const details: UndoDetail[] = [];
  const errors: string[] = [];
  let changesReverted = 0;

  // Process each change log entry
  for (const change of run.changeLogs) {
    try {
      const result = await revertChange(change);
      details.push(result);
      if (result.status === "reverted") {
        changesReverted++;
        // Mark as undone
        await prisma.lamChangeLog.update({
          where: { id: change.id },
          data: { undone: true },
        });
      } else if (result.status === "failed" && result.error) {
        errors.push(result.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      errors.push(`Failed to revert ${change.entityType} ${change.entityId}: ${message}`);
      details.push({
        change_id: change.id,
        entity_type: change.entityType,
        entity_id: change.entityId,
        operation: change.operation,
        status: "failed",
        error: message,
      });
    }
  }

  // Update run status
  if (changesReverted > 0) {
    await prisma.lamRun.update({
      where: { id: runId },
      data: {
        status: "completed",
        userSummary: `Undone: ${changesReverted} changes reverted`,
      },
    });
  }

  return {
    success: errors.length === 0,
    run_id: runId,
    changes_reverted: changesReverted,
    errors,
    details,
  };
}

/**
 * Undo the last run for a user
 */
export async function undoLastRun(userId: string): Promise<UndoResult> {
  // Find the most recent completed run
  const lastRun = await prisma.lamRun.findFirst({
    where: {
      userId,
      status: "completed",
    },
    orderBy: { createdAt: "desc" },
    include: {
      changeLogs: {
        where: { undone: false },
      },
    },
  });

  if (!lastRun) {
    return {
      success: false,
      run_id: "",
      changes_reverted: 0,
      errors: ["No completed runs found to undo"],
      details: [],
    };
  }

  if (lastRun.changeLogs.length === 0) {
    return {
      success: false,
      run_id: lastRun.id,
      changes_reverted: 0,
      errors: ["No undoable changes in the last run"],
      details: [],
    };
  }

  return undoRun(lastRun.id, userId);
}

/**
 * Revert a single change
 */
async function revertChange(change: {
  id: string;
  entityType: string;
  entityId: string;
  operation: string;
  beforeJson: unknown;
  afterJson: unknown;
}): Promise<UndoDetail> {
  const { entityType, entityId, operation, beforeJson } = change;

  switch (operation) {
    case "create": {
      // For create operations, delete the entity
      return await revertCreate(change.id, entityType, entityId);
    }
    case "update": {
      // For update operations, restore the before state
      return await revertUpdate(change.id, entityType, entityId, beforeJson);
    }
    case "delete": {
      // For delete operations, recreate the entity
      return await revertDelete(change.id, entityType, entityId, beforeJson);
    }
    default:
      return {
        change_id: change.id,
        entity_type: entityType,
        entity_id: entityId,
        operation,
        status: "skipped",
        error: `Unknown operation: ${operation}`,
      };
  }
}

async function revertCreate(
  changeId: string,
  entityType: string,
  entityId: string
): Promise<UndoDetail> {
  try {
    switch (entityType) {
      case "Contact":
        await prisma.contact.delete({ where: { id: entityId } });
        break;
      case "Deal":
        await prisma.deal.delete({ where: { id: entityId } });
        break;
      case "Task":
        await prisma.task.delete({ where: { id: entityId } });
        break;
      case "Note":
        await prisma.note.delete({ where: { id: entityId } });
        break;
      default:
        return {
          change_id: changeId,
          entity_type: entityType,
          entity_id: entityId,
          operation: "create",
          status: "skipped",
          error: `Unknown entity type: ${entityType}`,
        };
    }

    return {
      change_id: changeId,
      entity_type: entityType,
      entity_id: entityId,
      operation: "create",
      status: "reverted",
    };
  } catch (error) {
    return {
      change_id: changeId,
      entity_type: entityType,
      entity_id: entityId,
      operation: "create",
      status: "failed",
      error: error instanceof Error ? error.message : "Delete failed",
    };
  }
}

async function revertUpdate(
  changeId: string,
  entityType: string,
  entityId: string,
  beforeState: unknown
): Promise<UndoDetail> {
  if (!beforeState || typeof beforeState !== "object") {
    return {
      change_id: changeId,
      entity_type: entityType,
      entity_id: entityId,
      operation: "update",
      status: "failed",
      error: "No before state available",
    };
  }

  try {
    const state = beforeState as Record<string, unknown>;
    // Remove fields that shouldn't be updated
    const { id: _id, createdAt: _createdAt, ...updateData } = state;

    switch (entityType) {
      case "Contact":
        await prisma.contact.update({
          where: { id: entityId },
          data: updateData as Parameters<typeof prisma.contact.update>[0]["data"],
        });
        break;
      case "Deal":
        await prisma.deal.update({
          where: { id: entityId },
          data: updateData as Parameters<typeof prisma.deal.update>[0]["data"],
        });
        break;
      case "Task":
        await prisma.task.update({
          where: { id: entityId },
          data: updateData as Parameters<typeof prisma.task.update>[0]["data"],
        });
        break;
      case "Note":
        await prisma.note.update({
          where: { id: entityId },
          data: updateData as Parameters<typeof prisma.note.update>[0]["data"],
        });
        break;
      default:
        return {
          change_id: changeId,
          entity_type: entityType,
          entity_id: entityId,
          operation: "update",
          status: "skipped",
          error: `Unknown entity type: ${entityType}`,
        };
    }

    return {
      change_id: changeId,
      entity_type: entityType,
      entity_id: entityId,
      operation: "update",
      status: "reverted",
    };
  } catch (error) {
    return {
      change_id: changeId,
      entity_type: entityType,
      entity_id: entityId,
      operation: "update",
      status: "failed",
      error: error instanceof Error ? error.message : "Update failed",
    };
  }
}

async function revertDelete(
  changeId: string,
  entityType: string,
  entityId: string,
  beforeState: unknown
): Promise<UndoDetail> {
  if (!beforeState || typeof beforeState !== "object") {
    return {
      change_id: changeId,
      entity_type: entityType,
      entity_id: entityId,
      operation: "delete",
      status: "failed",
      error: "No before state available for recreation",
    };
  }

  try {
    const state = beforeState as Record<string, unknown>;

    switch (entityType) {
      case "Contact":
        await prisma.contact.create({
          data: state as Parameters<typeof prisma.contact.create>[0]["data"],
        });
        break;
      case "Deal":
        await prisma.deal.create({
          data: state as Parameters<typeof prisma.deal.create>[0]["data"],
        });
        break;
      case "Task":
        await prisma.task.create({
          data: state as Parameters<typeof prisma.task.create>[0]["data"],
        });
        break;
      case "Note":
        await prisma.note.create({
          data: state as Parameters<typeof prisma.note.create>[0]["data"],
        });
        break;
      default:
        return {
          change_id: changeId,
          entity_type: entityType,
          entity_id: entityId,
          operation: "delete",
          status: "skipped",
          error: `Unknown entity type: ${entityType}`,
        };
    }

    return {
      change_id: changeId,
      entity_type: entityType,
      entity_id: entityId,
      operation: "delete",
      status: "reverted",
    };
  } catch (error) {
    return {
      change_id: changeId,
      entity_type: entityType,
      entity_id: entityId,
      operation: "delete",
      status: "failed",
      error: error instanceof Error ? error.message : "Recreate failed",
    };
  }
}

/**
 * Check if a run can be undone
 */
export async function canUndo(runId: string, userId: string): Promise<{
  can_undo: boolean;
  reason?: string;
}> {
  const run = await prisma.lamRun.findUnique({
    where: { id: runId },
    include: {
      changeLogs: {
        where: { undone: false },
      },
      actions: true,
    },
  });

  if (!run) {
    return { can_undo: false, reason: "Run not found" };
  }

  if (run.userId !== userId) {
    return { can_undo: false, reason: "Permission denied" };
  }

  if (run.changeLogs.length === 0) {
    return { can_undo: false, reason: "No changes to undo" };
  }

  const hasTier2 = run.actions.some((a) => a.riskTier === 2 && a.status === "executed");
  if (hasTier2) {
    return { can_undo: false, reason: "Contains executed Tier 2 actions (external communications)" };
  }

  return { can_undo: true };
}

