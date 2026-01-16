// ============================================================================
// LLM Response Parser
// Parses lenient LLM responses and normalizes them to strict ActionPlan schema
// ============================================================================

import { z } from "zod";
import { randomUUID } from "crypto";
import {
  type ActionPlan,
  type Action,
  type ActionType,
  getRiskTier,
  requiresApproval,
} from "./actionSchema";

// ============================================================================
// Lenient Schemas for LLM Output
// These accept whatever the LLM generates and we fix it afterwards
// ============================================================================

const LenientActionSchema = z.object({
  action_id: z.string().optional(),
  idempotency_key: z.string().optional(),
  type: z.string(),
  risk_tier: z.union([z.number(), z.string()]).optional(),
  requires_approval: z.boolean().optional(),
  payload: z.record(z.string(), z.unknown()),
  expected_outcome: z.record(z.string(), z.unknown()).optional(),
});

const LenientPlanStepSchema = z.object({
  step_number: z.union([z.number(), z.string()]),
  description: z.string(),
  action_refs: z.array(z.string()).optional(),
});

const LenientVerificationStepSchema = z.object({
  step_number: z.union([z.number(), z.string()]),
  description: z.string(),
  query: z.string().optional(),
  expected: z.string().optional(),
});

export const LenientActionPlanSchema = z.object({
  plan_id: z.string().optional(),
  intent: z.string(),
  confidence: z.union([z.number(), z.string()]),
  plan_steps: z.array(LenientPlanStepSchema).optional(),
  actions: z.array(LenientActionSchema),
  verification_steps: z.array(LenientVerificationStepSchema).optional(),
  user_summary: z.string(),
  follow_up_question: z.string().nullable().optional(),
  requires_approval: z.boolean().optional(),
  highest_risk_tier: z.union([z.number(), z.string()]).optional(),
});

export type LenientActionPlan = z.infer<typeof LenientActionPlanSchema>;

// ============================================================================
// Normalizer - Converts lenient LLM output to strict ActionPlan
// ============================================================================

export function normalizeLLMResponse(
  raw: LenientActionPlan,
  userId: string
): ActionPlan {
  // Map LLM action IDs to real UUIDs
  const actionIdMap = new Map<string, string>();

  // First pass: generate UUIDs for all actions
  for (const action of raw.actions) {
    const oldId = action.action_id || `action-${actionIdMap.size + 1}`;
    const newId = randomUUID();
    actionIdMap.set(oldId, newId);
  }

  // Normalize actions
  const actions: Action[] = raw.actions.map((action, index) => {
    const actionType = normalizeActionType(action.type);
    const oldId = action.action_id || `action-${index + 1}`;
    const newId = actionIdMap.get(oldId) || randomUUID();

    return {
      action_id: newId,
      idempotency_key: action.idempotency_key || `${userId}:${actionType}:${Date.now()}:${index}`,
      type: actionType,
      risk_tier: getRiskTier(actionType),
      requires_approval: requiresApproval(actionType),
      payload: normalizePayload(actionType, action.payload),
      expected_outcome: normalizeExpectedOutcome(actionType, action.expected_outcome, action.payload),
    } as Action;
  });

  // Normalize plan steps (replace LLM action refs with real UUIDs)
  const planSteps = (raw.plan_steps || []).map((step, index) => ({
    step_number: typeof step.step_number === "string" ? parseInt(step.step_number, 10) : step.step_number,
    description: step.description,
    action_refs: (step.action_refs || []).map((ref) => actionIdMap.get(ref) || actions[index]?.action_id || randomUUID()),
  }));

  // If no plan steps, create one per action
  const finalPlanSteps = planSteps.length > 0 ? planSteps : actions.map((action, i) => ({
    step_number: i + 1,
    description: `Execute ${action.type}`,
    action_refs: [action.action_id],
  }));

  // Normalize verification steps
  const verificationSteps = (raw.verification_steps || []).map((step) => ({
    step_number: typeof step.step_number === "string" ? parseInt(step.step_number, 10) : step.step_number,
    description: step.description,
    query: step.query || "verify entity exists",
    expected: step.expected || "success",
  }));

  // Calculate risk tier
  let highestRiskTier: 0 | 1 | 2 = 0;
  let needsApproval = false;
  for (const action of actions) {
    if (action.risk_tier > highestRiskTier) {
      highestRiskTier = action.risk_tier as 0 | 1 | 2;
    }
    if (action.requires_approval) {
      needsApproval = true;
    }
  }

  return {
    plan_id: raw.plan_id && isValidUUID(raw.plan_id) ? raw.plan_id : randomUUID(),
    intent: raw.intent,
    confidence: typeof raw.confidence === "string" ? parseFloat(raw.confidence) : raw.confidence,
    plan_steps: finalPlanSteps,
    actions,
    verification_steps: verificationSteps,
    user_summary: raw.user_summary,
    follow_up_question: raw.follow_up_question || null,
    requires_approval: needsApproval,
    highest_risk_tier: highestRiskTier,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function normalizeActionType(type: string): ActionType {
  const validTypes: ActionType[] = [
    "lead.create", "lead.update",
    "deal.create", "deal.update", "deal.moveStage",
    "task.create", "task.complete",
    "note.append",
    "crm.search",
    "email.send", "sms.send",
  ];

  // Handle common LLM variations
  const normalized = type.toLowerCase().replace(/_/g, ".");
  
  if (validTypes.includes(normalized as ActionType)) {
    return normalized as ActionType;
  }

  // Map common variations
  const typeMap: Record<string, ActionType> = {
    "create_lead": "lead.create",
    "createLead": "lead.create",
    "create.lead": "lead.create",
    "contact.create": "lead.create",
    "update_lead": "lead.update",
    "updateLead": "lead.update",
    "contact.update": "lead.update",
    "create_deal": "deal.create",
    "createDeal": "deal.create",
    "update_deal": "deal.update",
    "updateDeal": "deal.update",
    "move_stage": "deal.moveStage",
    "moveStage": "deal.moveStage",
    "create_task": "task.create",
    "createTask": "task.create",
    "complete_task": "task.complete",
    "completeTask": "task.complete",
    "add_note": "note.append",
    "addNote": "note.append",
    "append_note": "note.append",
    "search": "crm.search",
    "send_email": "email.send",
    "sendEmail": "email.send",
    "send_sms": "sms.send",
    "sendSms": "sms.send",
  };

  return typeMap[type] || typeMap[normalized] || "lead.create";
}

function normalizePayload(actionType: ActionType, payload: Record<string, unknown>): Record<string, unknown> {
  switch (actionType) {
    case "lead.create":
      return {
        name: payload.name || payload.fullName || payload.full_name || "Unknown",
        email: payload.email,
        phone: payload.phone || payload.phoneNumber || payload.phone_number,
        source: payload.source,
        type: payload.type || "lead",
        tags: payload.tags,
        notes: payload.notes || payload.note || payload.description,
      };

    case "lead.update":
      return {
        id: payload.id || payload.leadId || payload.lead_id || payload.contactId || payload.contact_id,
        patch: payload.patch || {
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          notes: payload.notes,
        },
      };

    case "deal.create":
      return {
        title: payload.title || payload.name || "New Deal",
        value: payload.value || payload.amount || payload.price,
        stage: payload.stage || "new_lead",
        contactId: payload.contactId || payload.contact_id || payload.leadId || payload.lead_id,
        propertyId: payload.propertyId || payload.property_id,
        notes: payload.notes || payload.description,
      };

    case "task.create":
      return {
        title: payload.title || payload.name || "New Task",
        description: payload.description || payload.notes,
        dueDate: payload.dueDate || payload.due_date || payload.due,
        priority: payload.priority || "medium",
        contactId: payload.contactId || payload.contact_id,
        dealId: payload.dealId || payload.deal_id,
      };

    case "note.append":
      return {
        body: payload.body || payload.content || payload.note || payload.text || String(payload.notes || ""),
        contactId: payload.contactId || payload.contact_id || payload.leadId || payload.lead_id,
        dealId: payload.dealId || payload.deal_id,
      };

    case "crm.search":
      return {
        entity: payload.entity || payload.entityType || payload.entity_type || "contact",
        query: payload.query || payload.search || payload.q || "",
        filters: payload.filters,
        limit: payload.limit || 10,
      };

    default:
      return payload;
  }
}

function normalizeExpectedOutcome(
  actionType: ActionType,
  outcome: Record<string, unknown> | undefined,
  payload: Record<string, unknown>
): Record<string, unknown> {
  switch (actionType) {
    case "lead.create":
      return {
        entity_type: "contact",
        name: (outcome?.name || payload.name || "Unknown") as string,
        created: true,
      };

    case "lead.update":
      return {
        entity_type: "contact",
        entity_id: (outcome?.entity_id || payload.id || "") as string,
        updated_fields: (outcome?.updated_fields || Object.keys(payload.patch as Record<string, unknown> || {})) as string[],
      };

    case "deal.create":
      return {
        entity_type: "deal",
        title: (outcome?.title || payload.title || "New Deal") as string,
        created: true,
      };

    case "deal.update":
      return {
        entity_type: "deal",
        entity_id: (outcome?.entity_id || payload.id || "") as string,
        updated_fields: (outcome?.updated_fields || Object.keys(payload.patch as Record<string, unknown> || {})) as string[],
      };

    case "deal.moveStage":
      return {
        entity_type: "deal",
        entity_id: (outcome?.entity_id || payload.id || "") as string,
        stage: (outcome?.stage || payload.to_stage || payload.toStage || "") as string,
      };

    case "task.create":
      return {
        entity_type: "task",
        title: (outcome?.title || payload.title || "New Task") as string,
        created: true,
      };

    case "task.complete":
      return {
        entity_type: "task",
        entity_id: (outcome?.entity_id || payload.id || "") as string,
        completed: true,
      };

    case "note.append":
      return {
        entity_type: "note",
        created: true,
      };

    case "crm.search":
      return {
        entity_type: (outcome?.entity_type || payload.entity || "contact") as string,
        results_returned: true,
      };

    case "email.send":
      return {
        entity_type: "email",
        sent: true,
      };

    case "sms.send":
      return {
        entity_type: "sms",
        sent: true,
      };

    default:
      return outcome || {};
  }
}
