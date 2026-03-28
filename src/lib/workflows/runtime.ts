// ============================================================================
// COLONY - Workflow Runtime
// Subscribes to event bus, matches triggers, executes multi-step workflows
// ============================================================================

import { prisma } from "@/lib/prisma";
import { eventBus, type CrmEvent } from "@/lib/events";
import { computeForEntity } from "@/lib/ai-attributes/engine";
import { sendGmailEmail, getDefaultEmailAccount } from "@/lib/gmail";
import { sendSMS } from "@/lib/twilio";
import { fillTemplate } from "@/lib/email-templates";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkflowTrigger {
  type: string; // CrmEventType
  entityType?: string;
  conditions?: Record<string, unknown>; // field comparisons
}

export interface WorkflowStep {
  id: string;
  type: "action" | "condition" | "delay" | "ai";
  // Action step
  actionType?: string; // send_email, create_task, update_deal_stage, send_sms, add_tag
  params?: Record<string, unknown>;
  // Condition step
  field?: string;
  operator?: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "contains";
  value?: unknown;
  thenStep?: string; // step id to jump to if true
  elseStep?: string; // step id to jump to if false
  // Delay step
  delayMinutes?: number;
  // AI step
  attributeSlug?: string;
}

interface StepLog {
  stepId: string;
  status: "success" | "failed" | "skipped" | "delayed";
  result?: unknown;
  error?: string;
  executedAt: string;
}

// ---------------------------------------------------------------------------
// Initialize — subscribe to the event bus
// ---------------------------------------------------------------------------

let initialized = false;

export function initWorkflowRuntime(): void {
  if (initialized) return;
  initialized = true;

  eventBus.on(async (event) => {
    try {
      await handleEvent(event);
    } catch (error) {
      console.error("[Workflow Runtime] Event handler failed:", error);
    }
  });
}

// Auto-initialize on import
initWorkflowRuntime();

// ---------------------------------------------------------------------------
// Event handling — find matching workflows and trigger them
// ---------------------------------------------------------------------------

async function handleEvent(event: CrmEvent): Promise<void> {
  const workflows = await prisma.workflow.findMany({
    where: {
      userId: event.userId,
      status: "active",
    },
  });

  for (const workflow of workflows) {
    try {
      const trigger = workflow.trigger as unknown as WorkflowTrigger;

      if (!matchesTrigger(trigger, event)) continue;

      // Create a WorkflowRun and execute
      const run = await prisma.workflowRun.create({
        data: {
          workflowId: workflow.id,
          entityId: event.entityId,
          entityType: event.entityType,
          status: "running",
          steps: [],
        },
      });

      // Execute steps
      await executeWorkflow(workflow.id, run.id, event);
    } catch (error) {
      console.error(`[Workflow Runtime] Workflow ${workflow.id} failed:`, error);
    }
  }
}

// ---------------------------------------------------------------------------
// Trigger matching
// ---------------------------------------------------------------------------

function matchesTrigger(trigger: WorkflowTrigger, event: CrmEvent): boolean {
  // Match event type
  if (trigger.type !== event.type) return false;

  // Match entity type if specified
  if (trigger.entityType && trigger.entityType !== event.entityType) return false;

  // Evaluate conditions
  if (trigger.conditions) {
    const metadata = { ...event.metadata, ...flattenChanges(event.changes) };
    for (const [key, expected] of Object.entries(trigger.conditions)) {
      const actual = metadata[key];
      if (actual !== expected) return false;
    }
  }

  return true;
}

function flattenChanges(changes?: Record<string, { from: unknown; to: unknown }>): Record<string, unknown> {
  if (!changes) return {};
  const flat: Record<string, unknown> = {};
  for (const [key, { from, to }] of Object.entries(changes)) {
    flat[`${key}_from`] = from;
    flat[`${key}_to`] = to;
    flat[key] = to; // current value
  }
  return flat;
}

// ---------------------------------------------------------------------------
// Workflow execution — step by step
// ---------------------------------------------------------------------------

export async function executeWorkflow(
  workflowId: string,
  runId: string,
  event: CrmEvent,
  startFromStep = 0
): Promise<void> {
  const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
  if (!workflow) return;

  const steps = workflow.steps as unknown as WorkflowStep[];
  const run = await prisma.workflowRun.findUnique({ where: { id: runId } });
  if (!run || run.status === "cancelled") return;

  const stepLogs: StepLog[] = (run.steps as unknown as StepLog[]) || [];
  let currentIndex = startFromStep;

  while (currentIndex < steps.length) {
    const step = steps[currentIndex];
    if (!step) break;

    try {
      const result = await executeStep(step, event, workflow.userId);

      if (result.status === "delayed") {
        // Delay step — pause execution, schedule resumption
        stepLogs.push({
          stepId: step.id,
          status: "delayed",
          result: { delayMinutes: step.delayMinutes },
          executedAt: new Date().toISOString(),
        });

        const scheduledAt = new Date(Date.now() + (step.delayMinutes || 60) * 60 * 1000);

        await prisma.workflowRun.update({
          where: { id: runId },
          data: {
            status: "delayed",
            currentStep: currentIndex + 1,
            scheduledAt,
            steps: JSON.parse(JSON.stringify(stepLogs)),
          },
        });
        return; // Stop execution — cron will resume
      }

      if (result.status === "branched") {
        // Condition step — jump to a different step
        stepLogs.push({
          stepId: step.id,
          status: "success",
          result: { condition: result.conditionResult, jumpTo: result.jumpTo },
          executedAt: new Date().toISOString(),
        });

        if (result.jumpTo !== undefined) {
          // Find index by step ID
          const jumpIndex = steps.findIndex((s) => s.id === result.jumpTo);
          if (jumpIndex >= 0) {
            currentIndex = jumpIndex;
            continue;
          }
        }
        currentIndex++;
        continue;
      }

      stepLogs.push({
        stepId: step.id,
        status: result.status,
        result: result.data,
        executedAt: new Date().toISOString(),
      });

      if (result.status === "failed") {
        // Stop workflow on failure
        await prisma.workflowRun.update({
          where: { id: runId },
          data: {
            status: "failed",
            error: result.error || "Step failed",
            steps: JSON.parse(JSON.stringify(stepLogs)),
            completedAt: new Date(),
          },
        });
        return;
      }

      currentIndex++;
    } catch (error) {
      stepLogs.push({
        stepId: step.id,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        executedAt: new Date().toISOString(),
      });

      await prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: "failed",
          error: error instanceof Error ? error.message : "Step execution failed",
          steps: JSON.parse(JSON.stringify(stepLogs)),
          completedAt: new Date(),
        },
      });
      return;
    }
  }

  // All steps completed
  await prisma.workflowRun.update({
    where: { id: runId },
    data: {
      status: "completed",
      steps: JSON.parse(JSON.stringify(stepLogs)),
      completedAt: new Date(),
    },
  });

  // Update workflow stats
  await prisma.workflow.update({
    where: { id: workflowId },
    data: {
      runCount: { increment: 1 },
      lastRunAt: new Date(),
    },
  });
}

// ---------------------------------------------------------------------------
// Step execution
// ---------------------------------------------------------------------------

type StepResult =
  | { status: "success"; data?: unknown; error?: undefined }
  | { status: "failed"; error: string; data?: undefined }
  | { status: "skipped"; data?: unknown; error?: undefined }
  | { status: "delayed"; data?: undefined; error?: undefined }
  | { status: "branched"; conditionResult: boolean; jumpTo?: string; data?: undefined; error?: undefined };

async function executeStep(
  step: WorkflowStep,
  event: CrmEvent,
  userId: string
): Promise<StepResult> {
  switch (step.type) {
    case "action":
      return executeActionStep(step, event, userId);
    case "condition":
      return executeConditionStep(step, event);
    case "delay":
      return { status: "delayed" };
    case "ai":
      return executeAiStep(step, event, userId);
    default:
      return { status: "failed", error: `Unknown step type: ${step.type}` };
  }
}

async function executeActionStep(
  step: WorkflowStep,
  event: CrmEvent,
  userId: string
): Promise<StepResult> {
  const params = step.params || {};

  switch (step.actionType) {
    case "send_email": {
      const contact = await prisma.contact.findUnique({
        where: { id: event.entityId },
        select: { email: true, name: true },
      });
      if (!contact?.email) return { status: "skipped", data: { reason: "No email" } };

      const emailAccount = await getDefaultEmailAccount(userId);
      if (!emailAccount) return { status: "failed", error: "No email account configured" };

      const variables: Record<string, string> = {
        contactName: contact.name,
        firstName: contact.name.split(" ")[0],
      };

      await sendGmailEmail({
        emailAccountId: emailAccount.id,
        to: contact.email,
        subject: fillTemplate(String(params.subject || ""), variables),
        body: fillTemplate(String(params.body || ""), variables),
      });
      return { status: "success", data: { emailed: contact.email } };
    }

    case "create_task": {
      const task = await prisma.task.create({
        data: {
          userId,
          title: String(params.title || "Follow up"),
          completed: false,
          priority: String(params.priority || "medium"),
          dueDate: params.dueInDays
            ? new Date(Date.now() + Number(params.dueInDays) * 86400000)
            : undefined,
          contactId: event.entityType === "contact" ? event.entityId : undefined,
          dealId: event.entityType === "deal" ? event.entityId : undefined,
        },
      });
      return { status: "success", data: { taskId: task.id, title: task.title } };
    }

    case "update_deal_stage": {
      const dealId = event.entityType === "deal" ? event.entityId : undefined;
      if (!dealId) return { status: "skipped", data: { reason: "Not a deal entity" } };

      await prisma.deal.update({
        where: { id: dealId },
        data: { stage: String(params.newStage) },
      });
      return { status: "success", data: { newStage: params.newStage } };
    }

    case "send_sms": {
      const smsContact = await prisma.contact.findUnique({
        where: { id: event.entityId },
        select: { phone: true, name: true },
      });
      if (!smsContact?.phone) return { status: "skipped", data: { reason: "No phone" } };

      const smsVars: Record<string, string> = {
        contactName: smsContact.name,
        firstName: smsContact.name.split(" ")[0],
      };
      await sendSMS(smsContact.phone, fillTemplate(String(params.message || ""), smsVars));
      return { status: "success", data: { smsTo: smsContact.phone } };
    }

    case "add_tag": {
      if (event.entityType !== "contact") return { status: "skipped", data: { reason: "Not a contact" } };
      const tagContact = await prisma.contact.findUnique({
        where: { id: event.entityId },
        select: { tags: true },
      });
      if (!tagContact) return { status: "failed", error: "Contact not found" };

      const tag = String(params.tag);
      const currentTags = (tagContact.tags as string[]) ?? [];
      if (!currentTags.includes(tag)) {
        await prisma.contact.update({
          where: { id: event.entityId },
          data: { tags: [...currentTags, tag] },
        });
      }
      return { status: "success", data: { tag } };
    }

    case "enrich_contact": {
      if (event.entityType !== "contact") return { status: "skipped", data: { reason: "Not a contact" } };
      await prisma.enrichmentJob.create({
        data: { contactId: event.entityId },
      });
      return { status: "success", data: { queued: true } };
    }

    default:
      return { status: "failed", error: `Unknown action type: ${step.actionType}` };
  }
}

async function executeConditionStep(
  step: WorkflowStep,
  event: CrmEvent
): Promise<StepResult> {
  const field = step.field || "";
  const operator = step.operator || "eq";
  const expected = step.value;

  // Get the actual value from the event or from the entity
  let actual: unknown;

  // Check event metadata first
  const metadata = { ...event.metadata, ...flattenChanges(event.changes) };
  if (field in metadata) {
    actual = metadata[field];
  } else if (event.entityType === "contact") {
    // Look up from DB
    const contact = await prisma.contact.findUnique({
      where: { id: event.entityId },
      select: { type: true, source: true, tags: true, relationshipScore: true },
    });
    if (contact) {
      actual = (contact as Record<string, unknown>)[field];
    }
  }

  const conditionMet = evaluateCondition(actual, operator, expected);

  return {
    status: "branched",
    conditionResult: conditionMet,
    jumpTo: conditionMet ? step.thenStep : step.elseStep,
  };
}

function evaluateCondition(actual: unknown, operator: string, expected: unknown): boolean {
  switch (operator) {
    case "eq": return actual === expected;
    case "neq": return actual !== expected;
    case "gt": return Number(actual) > Number(expected);
    case "lt": return Number(actual) < Number(expected);
    case "gte": return Number(actual) >= Number(expected);
    case "lte": return Number(actual) <= Number(expected);
    case "contains":
      if (Array.isArray(actual)) return actual.includes(expected);
      return String(actual).toLowerCase().includes(String(expected).toLowerCase());
    default: return false;
  }
}

async function executeAiStep(
  step: WorkflowStep,
  event: CrmEvent,
  userId: string
): Promise<StepResult> {
  try {
    const result = await computeForEntity(event.entityId, event.entityType, userId);
    return { status: "success", data: { computed: result.computed } };
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : "AI computation failed" };
  }
}

// ---------------------------------------------------------------------------
// Resume delayed workflows (called by cron)
// ---------------------------------------------------------------------------

export async function processDelayedWorkflows(): Promise<{ processed: number }> {
  const delayedRuns = await prisma.workflowRun.findMany({
    where: {
      status: "delayed",
      scheduledAt: { lte: new Date() },
    },
    include: {
      workflow: { select: { userId: true, steps: true } },
    },
    take: 20,
  });

  let processed = 0;

  for (const run of delayedRuns) {
    try {
      // Reconstruct the event from the run data
      const event: CrmEvent = {
        type: "record.updated", // Generic type for resumed workflows
        entityType: run.entityType as CrmEvent["entityType"],
        entityId: run.entityId,
        userId: run.workflow.userId,
      };

      // Mark as running again
      await prisma.workflowRun.update({
        where: { id: run.id },
        data: { status: "running", scheduledAt: null },
      });

      await executeWorkflow(run.workflowId, run.id, event, run.currentStep);
      processed++;
    } catch (error) {
      console.error(`[Workflow Runtime] Failed to resume run ${run.id}:`, error);
      await prisma.workflowRun.update({
        where: { id: run.id },
        data: {
          status: "failed",
          error: error instanceof Error ? error.message : "Resume failed",
          completedAt: new Date(),
        },
      });
    }
  }

  return { processed };
}
