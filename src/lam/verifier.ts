// ============================================================================
// COLONY LAM - Verifier
// Verifies execution outcomes match expected outcomes
// ============================================================================

import { prisma } from "@/lib/prisma";
import type { ActionPlan, Action } from "./actionSchema";
import type { ExecutionResult, ActionResult } from "./runtime";

// ============================================================================
// Types
// ============================================================================

export interface VerificationStep {
  action_id: string;
  action_type: string;
  status: "verified" | "failed" | "skipped";
  expected: string;
  actual: string;
  match: boolean;
  error?: string;
}

export interface VerificationResult {
  run_id: string;
  status: "verified" | "partial" | "failed";
  verified_count: number;
  failed_count: number;
  skipped_count: number;
  steps: VerificationStep[];
  suggested_repair_actions?: Action[];
}

// ============================================================================
// Verification Functions
// ============================================================================

async function verifyLeadCreate(
  action: Action,
  result: ActionResult
): Promise<VerificationStep> {
  if (action.type !== "lead.create") {
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "skipped",
      expected: "",
      actual: "",
      match: false,
      error: "Invalid action type",
    };
  }

  if (result.status !== "success" || !result.entity_id) {
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "skipped",
      expected: "Contact created",
      actual: "Action failed",
      match: false,
    };
  }

  const contact = await prisma.contact.findUnique({
    where: { id: result.entity_id },
  });

  if (!contact) {
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "failed",
      expected: `Contact ${action.payload.name} exists`,
      actual: "Contact not found in database",
      match: false,
    };
  }

  const nameMatches = contact.name === action.payload.name;
  return {
    action_id: action.action_id,
    action_type: action.type,
    status: nameMatches ? "verified" : "failed",
    expected: `Contact ${action.payload.name} exists`,
    actual: `Contact ${contact.name} found`,
    match: nameMatches,
  };
}

async function verifyLeadUpdate(
  action: Action,
  result: ActionResult
): Promise<VerificationStep> {
  if (action.type !== "lead.update") {
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "skipped",
      expected: "",
      actual: "",
      match: false,
    };
  }

  if (result.status !== "success") {
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "skipped",
      expected: "Contact updated",
      actual: "Action failed",
      match: false,
    };
  }

  // Use entity_id from result (set by runtime) instead of action.payload.id (may be undefined)
  const contactId = result.entity_id || action.payload.id;
  
  if (!contactId) {
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "skipped",
      expected: "Contact updated",
      actual: "No contact ID available for verification",
      match: false,
    };
  }

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
  });

  if (!contact) {
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "failed",
      expected: `Contact ${contactId} updated`,
      actual: "Contact not found",
      match: false,
    };
  }

  // Verify each patched field
  const patchFields = Object.keys(action.payload.patch);
  const expectedFields = action.expected_outcome.updated_fields || [];
  
  let allMatch = true;
  for (const field of patchFields) {
    const expectedValue = action.payload.patch[field as keyof typeof action.payload.patch];
    const actualValue = contact[field as keyof typeof contact];
    // Deep comparison for arrays (like tags)
    if (expectedValue !== undefined) {
      if (Array.isArray(expectedValue) && Array.isArray(actualValue)) {
        const sortedExpected = [...expectedValue].sort();
        const sortedActual = [...actualValue].sort();
        if (JSON.stringify(sortedExpected) !== JSON.stringify(sortedActual)) {
          allMatch = false;
        }
      } else if (expectedValue !== actualValue) {
        allMatch = false;
      }
    }
  }

  return {
    action_id: action.action_id,
    action_type: action.type,
    status: allMatch ? "verified" : "failed",
    expected: `Fields updated: ${expectedFields.join(", ") || "tags"}`,
    actual: allMatch ? "All fields match" : "Some fields do not match",
    match: allMatch,
  };
}

async function verifyDealCreate(
  action: Action,
  result: ActionResult
): Promise<VerificationStep> {
  if (action.type !== "deal.create") {
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "skipped",
      expected: "",
      actual: "",
      match: false,
    };
  }

  if (result.status !== "success" || !result.entity_id) {
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "skipped",
      expected: "Deal created",
      actual: "Action failed",
      match: false,
    };
  }

  const deal = await prisma.deal.findUnique({
    where: { id: result.entity_id },
  });

  if (!deal) {
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "failed",
      expected: `Deal ${action.payload.title} exists`,
      actual: "Deal not found in database",
      match: false,
    };
  }

  const titleMatches = deal.title === action.payload.title;
  return {
    action_id: action.action_id,
    action_type: action.type,
    status: titleMatches ? "verified" : "failed",
    expected: `Deal ${action.payload.title} exists`,
    actual: `Deal ${deal.title} found`,
    match: titleMatches,
  };
}

async function verifyDealMoveStage(
  action: Action,
  result: ActionResult
): Promise<VerificationStep> {
  if (action.type !== "deal.moveStage") {
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "skipped",
      expected: "",
      actual: "",
      match: false,
    };
  }

  if (result.status !== "success") {
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "skipped",
      expected: "Deal stage updated",
      actual: "Action failed",
      match: false,
    };
  }

  const deal = await prisma.deal.findUnique({
    where: { id: action.payload.id },
  });

  if (!deal) {
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "failed",
      expected: `Deal at stage ${action.payload.to_stage}`,
      actual: "Deal not found",
      match: false,
    };
  }

  const stageMatches = deal.stage === action.payload.to_stage;
  return {
    action_id: action.action_id,
    action_type: action.type,
    status: stageMatches ? "verified" : "failed",
    expected: `Deal at stage ${action.payload.to_stage}`,
    actual: `Deal at stage ${deal.stage}`,
    match: stageMatches,
  };
}

async function verifyTaskCreate(
  action: Action,
  result: ActionResult
): Promise<VerificationStep> {
  if (action.type !== "task.create") {
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "skipped",
      expected: "",
      actual: "",
      match: false,
    };
  }

  if (result.status !== "success" || !result.entity_id) {
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "skipped",
      expected: "Task created",
      actual: "Action failed",
      match: false,
    };
  }

  const task = await prisma.task.findUnique({
    where: { id: result.entity_id },
  });

  if (!task) {
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "failed",
      expected: `Task ${action.payload.title} exists`,
      actual: "Task not found in database",
      match: false,
    };
  }

  const titleMatches = task.title === action.payload.title;
  return {
    action_id: action.action_id,
    action_type: action.type,
    status: titleMatches ? "verified" : "failed",
    expected: `Task ${action.payload.title} exists`,
    actual: `Task ${task.title} found`,
    match: titleMatches,
  };
}

async function verifyTaskComplete(
  action: Action,
  result: ActionResult
): Promise<VerificationStep> {
  if (action.type !== "task.complete") {
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "skipped",
      expected: "",
      actual: "",
      match: false,
    };
  }

  if (result.status !== "success") {
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "skipped",
      expected: "Task completed",
      actual: "Action failed",
      match: false,
    };
  }

  const task = await prisma.task.findUnique({
    where: { id: action.payload.id },
  });

  if (!task) {
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "failed",
      expected: "Task completed",
      actual: "Task not found",
      match: false,
    };
  }

  return {
    action_id: action.action_id,
    action_type: action.type,
    status: task.completed ? "verified" : "failed",
    expected: "Task completed = true",
    actual: `Task completed = ${task.completed}`,
    match: task.completed,
  };
}

async function verifyNoteAppend(
  action: Action,
  result: ActionResult
): Promise<VerificationStep> {
  if (action.type !== "note.append") {
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "skipped",
      expected: "",
      actual: "",
      match: false,
    };
  }

  if (result.status !== "success" || !result.entity_id) {
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "skipped",
      expected: "Note created",
      actual: "Action failed",
      match: false,
    };
  }

  const note = await prisma.note.findUnique({
    where: { id: result.entity_id },
  });

  if (!note) {
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "failed",
      expected: "Note exists",
      actual: "Note not found in database",
      match: false,
    };
  }

  return {
    action_id: action.action_id,
    action_type: action.type,
    status: "verified",
    expected: "Note exists",
    actual: "Note found",
    match: true,
  };
}

async function verifyCrmSearch(
  action: Action,
  result: ActionResult
): Promise<VerificationStep> {
  // Search actions always succeed if they return without error
  return {
    action_id: action.action_id,
    action_type: action.type,
    status: result.status === "success" ? "verified" : "failed",
    expected: "Search executed",
    actual: result.status === "success" ? "Search completed" : "Search failed",
    match: result.status === "success",
  };
}

// ============================================================================
// Main Verify Function
// ============================================================================

/**
 * Verify that execution results match expected outcomes
 */
export async function verify(
  plan: ActionPlan,
  executionResult: ExecutionResult
): Promise<VerificationResult> {
  const steps: VerificationStep[] = [];
  let verifiedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  // Map results by action_id for easy lookup
  const resultMap = new Map<string, ActionResult>();
  for (const result of executionResult.results) {
    resultMap.set(result.action_id, result);
  }

  // Verify each action
  for (const action of plan.actions) {
    const result = resultMap.get(action.action_id);
    if (!result) {
      steps.push({
        action_id: action.action_id,
        action_type: action.type,
        status: "skipped",
        expected: "Action executed",
        actual: "No execution result found",
        match: false,
      });
      skippedCount++;
      continue;
    }

    // Skip verification for approval_required actions
    if (result.status === "approval_required") {
      steps.push({
        action_id: action.action_id,
        action_type: action.type,
        status: "skipped",
        expected: "Awaiting approval",
        actual: "Pending approval",
        match: true,
      });
      skippedCount++;
      continue;
    }

    let step: VerificationStep;

    switch (action.type) {
      case "lead.create":
        step = await verifyLeadCreate(action, result);
        break;
      case "lead.update":
        step = await verifyLeadUpdate(action, result);
        break;
      case "deal.create":
        step = await verifyDealCreate(action, result);
        break;
      case "deal.update":
        // Similar to lead.update
        step = {
          action_id: action.action_id,
          action_type: action.type,
          status: result.status === "success" ? "verified" : "failed",
          expected: "Deal updated",
          actual: result.status === "success" ? "Deal updated" : "Failed",
          match: result.status === "success",
        };
        break;
      case "deal.moveStage":
        step = await verifyDealMoveStage(action, result);
        break;
      case "task.create":
        step = await verifyTaskCreate(action, result);
        break;
      case "task.complete":
        step = await verifyTaskComplete(action, result);
        break;
      case "note.append":
        step = await verifyNoteAppend(action, result);
        break;
      case "crm.search":
        step = await verifyCrmSearch(action, result);
        break;
      case "email.send":
      case "sms.send":
      case "referral.create":
      default:
        step = {
          action_id: action.action_id,
          action_type: action.type,
          status: result.status === "success" ? "verified" : "failed",
          expected: "Action completed",
          actual: result.status === "success" ? "Completed" : "Failed",
          match: result.status === "success",
        };
        break;
    }

    steps.push(step);

    if (step.status === "verified") {
      verifiedCount++;
    } else if (step.status === "failed") {
      failedCount++;
    } else {
      skippedCount++;
    }
  }

  // Determine overall status
  let status: VerificationResult["status"];
  if (failedCount === 0 && verifiedCount > 0) {
    status = "verified";
  } else if (failedCount > 0 && verifiedCount > 0) {
    status = "partial";
  } else if (failedCount > 0) {
    status = "failed";
  } else {
    status = "verified";
  }

  return {
    run_id: executionResult.run_id,
    status,
    verified_count: verifiedCount,
    failed_count: failedCount,
    skipped_count: skippedCount,
    steps,
  };
}

