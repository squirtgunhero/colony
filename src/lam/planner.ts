// ============================================================================
// COLONY LAM - Planner
// Converts natural language to structured ActionPlan using LLM
// ============================================================================

import { randomUUID } from "crypto";
import {
  type ActionPlan,
  type ActionType,
  getRiskTier,
  requiresApproval,
} from "./actionSchema";
import { getDefaultProvider, type LLMMessage } from "./llm";

// ============================================================================
// Types
// ============================================================================

export interface PlannerInput {
  user_message: string;
  user_id: string;
  recent_context?: RecentContext[];
  permissions?: string[];
}

export interface RecentContext {
  entity_type: "contact" | "deal" | "task" | "property";
  entity_id: string;
  entity_name?: string;
  last_touched: Date;
}

export interface PlannerResult {
  success: true;
  plan: ActionPlan;
  llm_usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface PlannerError {
  success: false;
  error: string;
  code:
    | "INVALID_INPUT"
    | "LLM_ERROR"
    | "VALIDATION_ERROR"
    | "PERMISSION_DENIED";
}

export type PlannerOutput = PlannerResult | PlannerError;

// ============================================================================
// System Prompt
// ============================================================================

const SYSTEM_PROMPT = `You are Colony LAM (Large Action Model), an AI that converts natural language into structured CRM actions.

IMPORTANT: You MUST respond with valid JSON only. No markdown, no explanation, just the JSON object.

## Your Role
You analyze user requests and generate a precise ActionPlan that the system will execute. You NEVER execute actions directly - you only propose them.

## Available Actions
1. lead.create - Create a new lead/contact
2. lead.update - Update an existing lead. Can use "name" field to find contact, OR provide "id" if known.
3. deal.create - Create a new deal
4. deal.update - Update an existing deal (requires id or title)
5. deal.moveStage - Move a deal to a different stage
6. task.create - Create a new task
7. task.complete - Mark a task as complete
8. note.append - Add a note to a contact or deal
9. crm.search - Search for entities (READ-ONLY) - only use if user explicitly asks to search/find
10. email.send - Send an email (REQUIRES APPROVAL)
11. sms.send - Send an SMS (REQUIRES APPROVAL)

## Risk Tiers
- Tier 0: Read-only actions (crm.search) - auto-execute
- Tier 1: Mutations (create/update) - auto-execute with undo capability
- Tier 2: External communications (email/sms) - requires user approval

## Critical Rules
1. For lead.update: Include "name" in payload to identify the contact. System will auto-lookup by name. NO crm.search needed!
2. Generate ONLY ONE action when possible. Don't generate search+update, just generate update with the name.
3. If required fields are missing, ask ONE follow-up question (set follow_up_question).
4. Set requires_approval=true for Tier 2 actions.
5. Be conservative - if unsure, ask rather than guess.
6. The user_summary should clearly state what will happen in plain language.

## Output Format
Return a JSON object matching this schema:
{
  "plan_id": "<uuid>",
  "intent": "<one-line description of what user wants>",
  "confidence": <0.0-1.0>,
  "plan_steps": [
    {"step_number": 1, "description": "<what this step does>", "action_refs": ["<action_id>"]}
  ],
  "actions": [
    {
      "action_id": "<uuid>",
      "idempotency_key": "<unique key>",
      "type": "<action type>",
      "risk_tier": <0|1|2>,
      "requires_approval": <boolean>,
      "payload": {<action-specific payload>},
      "expected_outcome": {<expected result>}
    }
  ],
  "verification_steps": [
    {"step_number": 1, "description": "<what to verify>", "query": "<db query>", "expected": "<result>"}
  ],
  "user_summary": "<plain language summary for user>",
  "follow_up_question": "<question if info needed, or null>",
  "requires_approval": <true if any action is Tier 2>,
  "highest_risk_tier": <max risk tier of all actions>
}`;

// ============================================================================
// Planner Implementation
// ============================================================================

function generateUUID(): string {
  return randomUUID();
}

// ============================================================================
// Manual LLM Response Normalizer (no Zod to avoid version issues)
// ============================================================================

function normalizeLLMResponseManual(
  raw: Record<string, unknown>,
  userId: string
): ActionPlan {
  const actions = Array.isArray(raw.actions) ? raw.actions : [];
  
  // Build normalized actions
  const normalizedActions: ActionPlan["actions"] = actions.map((action: Record<string, unknown>, index: number) => {
    const actionType = normalizeActionType(String(action.type || "lead.create"));
    const payload = (action.payload || {}) as Record<string, unknown>;
    
    return {
      action_id: generateUUID(),
      idempotency_key: String(action.idempotency_key || `${userId}:${actionType}:${Date.now()}:${index}`),
      type: actionType,
      risk_tier: getRiskTier(actionType),
      requires_approval: requiresApproval(actionType),
      payload: normalizePayload(actionType, payload),
      expected_outcome: normalizeExpectedOutcome(actionType, payload),
    } as ActionPlan["actions"][0];
  });

  // Build plan steps
  const planSteps = normalizedActions.map((action, i) => ({
    step_number: i + 1,
    description: `Execute ${action.type}`,
    action_refs: [action.action_id],
  }));

  // Calculate risk
  let highestRiskTier: 0 | 1 | 2 = 0;
  let needsApproval = false;
  for (const action of normalizedActions) {
    if (action.risk_tier > highestRiskTier) {
      highestRiskTier = action.risk_tier as 0 | 1 | 2;
    }
    if (action.requires_approval) {
      needsApproval = true;
    }
  }

  return {
    plan_id: generateUUID(),
    intent: String(raw.intent || "Execute user request"),
    confidence: Number(raw.confidence) || 0.8,
    plan_steps: planSteps,
    actions: normalizedActions,
    verification_steps: [{
      step_number: 1,
      description: "Verify actions completed",
      query: "Check entities exist",
      expected: "success",
    }],
    user_summary: String(raw.user_summary || "I will execute your request."),
    follow_up_question: raw.follow_up_question ? String(raw.follow_up_question) : null,
    requires_approval: needsApproval,
    highest_risk_tier: highestRiskTier,
  };
}

function normalizeActionType(type: string): ActionType {
  const validTypes: ActionType[] = [
    "lead.create", "lead.update",
    "deal.create", "deal.update", "deal.moveStage",
    "task.create", "task.complete",
    "note.append", "crm.search",
    "email.send", "sms.send",
  ];

  const normalized = type.toLowerCase().replace(/_/g, ".");
  if (validTypes.includes(normalized as ActionType)) {
    return normalized as ActionType;
  }

  // Map common variations
  const typeMap: Record<string, ActionType> = {
    "create_lead": "lead.create",
    "createlead": "lead.create",
    "contact.create": "lead.create",
  };

  return typeMap[type.toLowerCase()] || "lead.create";
}

function normalizePayload(actionType: ActionType, payload: Record<string, unknown>): Record<string, unknown> {
  switch (actionType) {
    case "lead.create":
      return {
        name: payload.name || payload.fullName || "Unknown",
        email: payload.email,
        phone: payload.phone,
        source: payload.source,
        type: payload.type || "lead",
        tags: payload.tags,
        notes: payload.notes || payload.note || payload.description,
      };
    case "lead.update": {
      // Handle nested patch or flat payload
      const patch = (payload.patch || {}) as Record<string, unknown>;
      const contactId = payload.id || payload.leadId || payload.lead_id || payload.contactId || payload.contact_id;
      const contactName = payload.contactName || payload.name || patch.name;
      
      return {
        id: contactId,
        // Include name so runtime can look up contact if ID is missing
        name: contactName,
        contactName: contactName,
        patch: {
          // Don't include name in patch unless we're actually changing the name
          email: patch.email || payload.email,
          phone: patch.phone || payload.phone,
          source: patch.source || payload.source,
          type: patch.type,
          tags: patch.tags || payload.tags,
          notes: patch.notes || payload.notes,
          isFavorite: patch.isFavorite ?? payload.isFavorite,
        },
      };
    }
    case "task.create":
      return {
        title: payload.title || payload.name || "New Task",
        description: payload.description,
        priority: payload.priority || "medium",
      };
    case "deal.create":
      return {
        title: payload.title || payload.name || "New Deal",
        value: payload.value,
        stage: payload.stage || "new_lead",
      };
    case "note.append":
      return {
        body: payload.body || payload.content || payload.note || String(payload.notes || ""),
        contactId: payload.contactId || payload.leadId,
      };
    case "crm.search":
      return {
        entity: payload.entity || payload.entityType || "contact",
        query: payload.query || payload.search || payload.name || "",
        filters: payload.filters,
        limit: payload.limit || 10,
      };
    default:
      return payload;
  }
}

function normalizeExpectedOutcome(actionType: ActionType, payload: Record<string, unknown>): Record<string, unknown> {
  switch (actionType) {
    case "lead.create":
      return { entity_type: "contact", name: String(payload.name || "Unknown"), created: true };
    case "lead.update": {
      const patch = (payload.patch || {}) as Record<string, unknown>;
      return { 
        entity_type: "contact", 
        entity_id: String(payload.id || ""),
        updated_fields: Object.keys(patch).filter(k => patch[k] !== undefined),
      };
    }
    case "deal.create":
      return { entity_type: "deal", title: String(payload.title || "New Deal"), created: true };
    case "task.create":
      return { entity_type: "task", title: String(payload.title || "New Task"), created: true };
    case "note.append":
      return { entity_type: "note", created: true };
    case "crm.search":
      return { entity_type: String(payload.entity || "contact"), results_returned: true };
    default:
      return { entity_type: actionType.split(".")[0], success: true };
  }
}

function buildContextMessage(input: PlannerInput): string {
  let contextMsg = "";

  if (input.recent_context && input.recent_context.length > 0) {
    contextMsg += "\n\n## Recent Context\n";
    contextMsg += "Recently touched entities (use these IDs if relevant):\n";
    for (const ctx of input.recent_context.slice(0, 20)) {
      contextMsg += `- ${ctx.entity_type}: ${ctx.entity_name || ctx.entity_id} (ID: ${ctx.entity_id})\n`;
    }
  }

  if (input.permissions && input.permissions.length > 0) {
    contextMsg += "\n\n## User Permissions\n";
    contextMsg += `Allowed: ${input.permissions.join(", ")}\n`;
  }

  return contextMsg;
}

/**
 * Generate an ActionPlan from a natural language message
 */
export async function planFromMessage(
  input: PlannerInput
): Promise<PlannerOutput> {
  // Validate input
  if (!input.user_message || input.user_message.trim().length === 0) {
    return {
      success: false,
      error: "User message is required",
      code: "INVALID_INPUT",
    };
  }

  if (!input.user_id) {
    return {
      success: false,
      error: "User ID is required",
      code: "INVALID_INPUT",
    };
  }

  try {
    const llm = getDefaultProvider();

    const contextMessage = buildContextMessage(input);

    const messages: LLMMessage[] = [
      { role: "system", content: SYSTEM_PROMPT + contextMessage },
      { role: "user", content: input.user_message + "\n\nRespond with a valid JSON object only." },
    ];

    // Get raw JSON from LLM (don't use schema validation at LLM level)
    const response = await llm.complete(messages, { temperature: 0.1 });
    
    // Extract JSON from response
    let jsonContent = response.content.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent.slice(7);
    }
    if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.slice(3);
    }
    if (jsonContent.endsWith("```")) {
      jsonContent = jsonContent.slice(0, -3);
    }
    jsonContent = jsonContent.trim();

    // Parse JSON
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonContent);
    } catch {
      throw new Error(`Failed to parse LLM JSON response: ${jsonContent.slice(0, 200)}...`);
    }

    // Normalize LLM output to strict ActionPlan (no Zod, just manual parsing)
    const normalizedPlan = normalizeLLMResponseManual(parsed, input.user_id);

    // Post-process to ensure consistency
    const plan = postProcessPlan(normalizedPlan, input);

    return {
      success: true,
      plan,
      llm_usage: response.usage,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("validation failed")) {
      return {
        success: false,
        error: `Plan validation error: ${message}`,
        code: "VALIDATION_ERROR",
      };
    }

    return {
      success: false,
      error: `LLM error: ${message}`,
      code: "LLM_ERROR",
    };
  }
}

/**
 * Post-process plan to ensure consistency and fill in derived fields
 */
function postProcessPlan(plan: ActionPlan, input: PlannerInput): ActionPlan {
  // Ensure plan_id exists
  if (!plan.plan_id) {
    plan.plan_id = generateUUID();
  }

  // Calculate highest risk tier
  let highestRisk: 0 | 1 | 2 = 0;
  let needsApproval = false;

  for (const action of plan.actions) {
    // Ensure action has proper risk tier
    const correctRiskTier = getRiskTier(action.type as ActionType);
    action.risk_tier = correctRiskTier;
    action.requires_approval = requiresApproval(action.type as ActionType);

    if (correctRiskTier > highestRisk) {
      highestRisk = correctRiskTier as 0 | 1 | 2;
    }
    if (action.requires_approval) {
      needsApproval = true;
    }

    // Ensure idempotency key includes user context
    if (!action.idempotency_key.includes(input.user_id)) {
      action.idempotency_key = `${input.user_id}:${action.idempotency_key}`;
    }
  }

  plan.highest_risk_tier = highestRisk;
  plan.requires_approval = needsApproval;

  return plan;
}

/**
 * Create a simple plan for a single action (utility function)
 */
export function createSimplePlan(
  actionType: ActionType,
  payload: Record<string, unknown>,
  userId: string
): ActionPlan {
  const actionId = generateUUID();
  const planId = generateUUID();
  const riskTier = getRiskTier(actionType);
  const needsApproval = requiresApproval(actionType);

  return {
    plan_id: planId,
    intent: `Execute ${actionType}`,
    confidence: 1.0,
    plan_steps: [
      {
        step_number: 1,
        description: `Execute ${actionType}`,
        action_refs: [actionId],
      },
    ],
    actions: [
      {
        action_id: actionId,
        idempotency_key: `${userId}:${actionType}:${Date.now()}`,
        type: actionType,
        risk_tier: riskTier,
        requires_approval: needsApproval,
        payload,
        expected_outcome: { entity_type: actionType.split(".")[0] },
      } as ActionPlan["actions"][0],
    ],
    verification_steps: [
      {
        step_number: 1,
        description: `Verify ${actionType} completed`,
        query: `Check ${actionType.split(".")[0]} exists`,
        expected: "Entity should exist",
      },
    ],
    user_summary: `Will execute ${actionType}`,
    follow_up_question: null,
    requires_approval: needsApproval,
    highest_risk_tier: riskTier,
  };
}

/**
 * Create a plan that only asks a follow-up question
 */
export function createFollowUpPlan(
  question: string,
  intent: string,
  userId: string
): ActionPlan {
  return {
    plan_id: generateUUID(),
    intent,
    confidence: 0.5,
    plan_steps: [],
    actions: [],
    verification_steps: [],
    user_summary: "I need more information to proceed.",
    follow_up_question: question,
    requires_approval: false,
    highest_risk_tier: 0,
  };
}

