// ============================================================================
// COLONY LAM - Action Schema (World Model)
// Defines the strict set of actions the LAM can propose
// ============================================================================

import { z } from "zod";

// ============================================================================
// Base Types
// ============================================================================

export const RiskTier = z.union([z.literal(0), z.literal(1), z.literal(2)]);
export type RiskTier = z.infer<typeof RiskTier>;

// Base action fields that all actions must have
export const BaseActionSchema = z.object({
  action_id: z.string().uuid(),
  idempotency_key: z.string().min(1),
  risk_tier: RiskTier,
  requires_approval: z.boolean(),
});

// ============================================================================
// Lead/Contact Actions
// ============================================================================

export const LeadCreatePayloadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  source: z.string().optional(),
  type: z.enum(["lead", "client", "agent", "vendor"]).optional().default("lead"),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const LeadCreateExpectedOutcomeSchema = z.object({
  entity_type: z.literal("contact"),
  name: z.string(),
  created: z.literal(true),
});

export const LeadCreateActionSchema = BaseActionSchema.extend({
  type: z.literal("lead.create"),
  payload: LeadCreatePayloadSchema,
  expected_outcome: LeadCreateExpectedOutcomeSchema,
});

export const LeadUpdatePayloadSchema = z.object({
  // Either id OR name must be provided - runtime will resolve name to id
  id: z.string().optional(),
  name: z.string().optional(), // For name-based lookup if id not provided
  contactName: z.string().optional(), // Alternative field for name lookup
  patch: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    source: z.string().optional(),
    type: z.enum(["lead", "client", "agent", "vendor"]).optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
    isFavorite: z.boolean().optional(),
  }),
}).refine(
  (data) => data.id || data.name || data.contactName,
  { message: "Either id, name, or contactName must be provided" }
);

export const LeadUpdateExpectedOutcomeSchema = z.object({
  entity_type: z.literal("contact"),
  entity_id: z.string().optional(), // Optional since name-based lookup happens at runtime
  updated_fields: z.array(z.string()),
});

export const LeadUpdateActionSchema = BaseActionSchema.extend({
  type: z.literal("lead.update"),
  payload: LeadUpdatePayloadSchema,
  expected_outcome: LeadUpdateExpectedOutcomeSchema,
});

export const LeadDeletePayloadSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
}).refine(
  (data) => data.id || data.name,
  { message: "Either id or name must be provided" }
);

export const LeadDeleteExpectedOutcomeSchema = z.object({
  entity_type: z.literal("contact"),
  deleted: z.literal(true),
});

export const LeadDeleteActionSchema = BaseActionSchema.extend({
  type: z.literal("lead.delete"),
  payload: LeadDeletePayloadSchema,
  expected_outcome: LeadDeleteExpectedOutcomeSchema,
});

export const LeadDeleteAllPayloadSchema = z.object({
  confirm: z.literal(true),
});

export const LeadDeleteAllExpectedOutcomeSchema = z.object({
  entity_type: z.literal("contact"),
  deleted_all: z.literal(true),
});

export const LeadDeleteAllActionSchema = BaseActionSchema.extend({
  type: z.literal("lead.deleteAll"),
  payload: LeadDeleteAllPayloadSchema,
  expected_outcome: LeadDeleteAllExpectedOutcomeSchema,
});

// ============================================================================
// Deal Actions
// ============================================================================

export const DealStage = z.enum([
  "new_lead",
  "qualified",
  "showing",
  "offer",
  "negotiation",
  "closed",
]);
export type DealStage = z.infer<typeof DealStage>;

export const DealCreatePayloadSchema = z.object({
  title: z.string().min(1),
  value: z.number().optional(),
  stage: DealStage.default("new_lead"),
  contactId: z.string().optional(),
  propertyId: z.string().optional(),
  expectedCloseDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const DealCreateExpectedOutcomeSchema = z.object({
  entity_type: z.literal("deal"),
  title: z.string(),
  created: z.literal(true),
});

export const DealCreateActionSchema = BaseActionSchema.extend({
  type: z.literal("deal.create"),
  payload: DealCreatePayloadSchema,
  expected_outcome: DealCreateExpectedOutcomeSchema,
});

export const DealUpdatePayloadSchema = z.object({
  id: z.string(),
  patch: z.object({
    title: z.string().optional(),
    value: z.number().optional(),
    stage: DealStage.optional(),
    contactId: z.string().optional(),
    propertyId: z.string().optional(),
    expectedCloseDate: z.string().datetime().optional(),
    notes: z.string().optional(),
    isFavorite: z.boolean().optional(),
  }),
});

export const DealUpdateExpectedOutcomeSchema = z.object({
  entity_type: z.literal("deal"),
  entity_id: z.string(),
  updated_fields: z.array(z.string()),
});

export const DealUpdateActionSchema = BaseActionSchema.extend({
  type: z.literal("deal.update"),
  payload: DealUpdatePayloadSchema,
  expected_outcome: DealUpdateExpectedOutcomeSchema,
});

export const DealMoveStagePayloadSchema = z.object({
  id: z.string(),
  from_stage: DealStage,
  to_stage: DealStage,
});

export const DealMoveStageExpectedOutcomeSchema = z.object({
  entity_type: z.literal("deal"),
  entity_id: z.string(),
  stage: DealStage,
});

export const DealMoveStageActionSchema = BaseActionSchema.extend({
  type: z.literal("deal.moveStage"),
  payload: DealMoveStagePayloadSchema,
  expected_outcome: DealMoveStageExpectedOutcomeSchema,
});

export const DealDeletePayloadSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
}).refine(
  (data) => data.id || data.title,
  { message: "Either id or title must be provided" }
);

export const DealDeleteExpectedOutcomeSchema = z.object({
  entity_type: z.literal("deal"),
  deleted: z.literal(true),
});

export const DealDeleteActionSchema = BaseActionSchema.extend({
  type: z.literal("deal.delete"),
  payload: DealDeletePayloadSchema,
  expected_outcome: DealDeleteExpectedOutcomeSchema,
});

export const DealDeleteAllPayloadSchema = z.object({
  confirm: z.literal(true),
});

export const DealDeleteAllExpectedOutcomeSchema = z.object({
  entity_type: z.literal("deal"),
  deleted_all: z.literal(true),
});

export const DealDeleteAllActionSchema = BaseActionSchema.extend({
  type: z.literal("deal.deleteAll"),
  payload: DealDeleteAllPayloadSchema,
  expected_outcome: DealDeleteAllExpectedOutcomeSchema,
});

// ============================================================================
// Task Actions
// ============================================================================

export const TaskPriority = z.enum(["low", "medium", "high"]);
export type TaskPriority = z.infer<typeof TaskPriority>;

export const TaskCreatePayloadSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  priority: TaskPriority.default("medium"),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  propertyId: z.string().optional(),
});

export const TaskCreateExpectedOutcomeSchema = z.object({
  entity_type: z.literal("task"),
  title: z.string(),
  created: z.literal(true),
});

export const TaskCreateActionSchema = BaseActionSchema.extend({
  type: z.literal("task.create"),
  payload: TaskCreatePayloadSchema,
  expected_outcome: TaskCreateExpectedOutcomeSchema,
});

export const TaskCompletePayloadSchema = z.object({
  id: z.string(),
});

export const TaskCompleteExpectedOutcomeSchema = z.object({
  entity_type: z.literal("task"),
  entity_id: z.string(),
  completed: z.literal(true),
});

export const TaskCompleteActionSchema = BaseActionSchema.extend({
  type: z.literal("task.complete"),
  payload: TaskCompletePayloadSchema,
  expected_outcome: TaskCompleteExpectedOutcomeSchema,
});

export const TaskDeletePayloadSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
}).refine(
  (data) => data.id || data.title,
  { message: "Either id or title must be provided" }
);

export const TaskDeleteExpectedOutcomeSchema = z.object({
  entity_type: z.literal("task"),
  deleted: z.literal(true),
});

export const TaskDeleteActionSchema = BaseActionSchema.extend({
  type: z.literal("task.delete"),
  payload: TaskDeletePayloadSchema,
  expected_outcome: TaskDeleteExpectedOutcomeSchema,
});

export const TaskDeleteAllPayloadSchema = z.object({
  confirm: z.literal(true),
});

export const TaskDeleteAllExpectedOutcomeSchema = z.object({
  entity_type: z.literal("task"),
  deleted_all: z.literal(true),
});

export const TaskDeleteAllActionSchema = BaseActionSchema.extend({
  type: z.literal("task.deleteAll"),
  payload: TaskDeleteAllPayloadSchema,
  expected_outcome: TaskDeleteAllExpectedOutcomeSchema,
});

// ============================================================================
// Note Actions
// ============================================================================

export const NoteAppendPayloadSchema = z.object({
  body: z.string().min(1),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
});

export const NoteAppendExpectedOutcomeSchema = z.object({
  entity_type: z.literal("note"),
  created: z.literal(true),
});

export const NoteAppendActionSchema = BaseActionSchema.extend({
  type: z.literal("note.append"),
  payload: NoteAppendPayloadSchema,
  expected_outcome: NoteAppendExpectedOutcomeSchema,
});

export const NoteDeletePayloadSchema = z.object({
  id: z.string(),
});

export const NoteDeleteExpectedOutcomeSchema = z.object({
  entity_type: z.literal("note"),
  deleted: z.literal(true),
});

export const NoteDeleteActionSchema = BaseActionSchema.extend({
  type: z.literal("note.delete"),
  payload: NoteDeletePayloadSchema,
  expected_outcome: NoteDeleteExpectedOutcomeSchema,
});

// ============================================================================
// Search Actions (Read-only, Tier 0)
// ============================================================================

export const CrmSearchPayloadSchema = z.object({
  entity: z.enum(["contact", "deal", "task", "property", "referral"]),
  query: z.string(),
  filters: z
    .object({
      type: z.string().optional(),
      stage: z.string().optional(),
      status: z.string().optional(),
      source: z.string().optional(),
      category: z.string().optional(),
    })
    .optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

export const CrmSearchExpectedOutcomeSchema = z.object({
  entity_type: z.string(),
  results_returned: z.boolean(),
});

export const CrmSearchActionSchema = BaseActionSchema.extend({
  type: z.literal("crm.search"),
  payload: CrmSearchPayloadSchema,
  expected_outcome: CrmSearchExpectedOutcomeSchema,
});

// ============================================================================
// Ads Actions
// ============================================================================

export const AdsCreateCampaignPayloadSchema = z.object({
  objective: z.enum(["LEADS", "TRAFFIC", "AWARENESS", "ENGAGEMENT", "SALES"]).default("LEADS"),
  daily_budget: z.number().optional().default(10),
  name: z.string().optional(),
});

export const AdsCreateCampaignExpectedOutcomeSchema = z.object({
  entity_type: z.literal("campaign"),
  created: z.literal(true),
});

export const AdsCreateCampaignActionSchema = BaseActionSchema.extend({
  type: z.literal("ads.create_campaign"),
  payload: AdsCreateCampaignPayloadSchema,
  expected_outcome: AdsCreateCampaignExpectedOutcomeSchema,
});

export const AdsCheckPerformancePayloadSchema = z.object({
  campaign_name: z.string().optional(),
});

export const AdsCheckPerformanceExpectedOutcomeSchema = z.object({
  entity_type: z.literal("campaign"),
  results_returned: z.literal(true),
});

export const AdsCheckPerformanceActionSchema = BaseActionSchema.extend({
  type: z.literal("ads.check_performance"),
  payload: AdsCheckPerformancePayloadSchema,
  expected_outcome: AdsCheckPerformanceExpectedOutcomeSchema,
});

export const AdsPauseCampaignPayloadSchema = z.object({
  campaign_name: z.string(),
});

export const AdsPauseCampaignExpectedOutcomeSchema = z.object({
  entity_type: z.literal("campaign"),
  paused: z.literal(true),
});

export const AdsPauseCampaignActionSchema = BaseActionSchema.extend({
  type: z.literal("ads.pause_campaign"),
  payload: AdsPauseCampaignPayloadSchema,
  expected_outcome: AdsPauseCampaignExpectedOutcomeSchema,
});

export const AdsResumeCampaignPayloadSchema = z.object({
  campaign_name: z.string(),
});

export const AdsResumeCampaignExpectedOutcomeSchema = z.object({
  entity_type: z.literal("campaign"),
  resumed: z.literal(true),
});

export const AdsResumeCampaignActionSchema = BaseActionSchema.extend({
  type: z.literal("ads.resume_campaign"),
  payload: AdsResumeCampaignPayloadSchema,
  expected_outcome: AdsResumeCampaignExpectedOutcomeSchema,
});

// ============================================================================
// External Communication Actions (Tier 2 - Approval Required)
// ============================================================================

export const EmailSendPayloadSchema = z.object({
  contactId: z.string(),
  subject: z.string().min(1),
  body: z.string().min(1),
});

export const EmailSendExpectedOutcomeSchema = z.object({
  entity_type: z.literal("email"),
  sent: z.literal(true),
});

export const EmailSendActionSchema = BaseActionSchema.extend({
  type: z.literal("email.send"),
  payload: EmailSendPayloadSchema,
  expected_outcome: EmailSendExpectedOutcomeSchema,
});

export const SmsSendPayloadSchema = z.object({
  contactId: z.string(),
  message: z.string().min(1).max(1600),
});

export const SmsSendExpectedOutcomeSchema = z.object({
  entity_type: z.literal("sms"),
  sent: z.literal(true),
});

export const SmsSendActionSchema = BaseActionSchema.extend({
  type: z.literal("sms.send"),
  payload: SmsSendPayloadSchema,
  expected_outcome: SmsSendExpectedOutcomeSchema,
});

// ============================================================================
// Referral Actions
// ============================================================================

export const ReferralCreatePayloadSchema = z.object({
  title: z.string(),
  category: z.string(),
  description: z.string().optional(),
  locationText: z.string().optional(),
  valueEstimate: z.number().optional(),
  visibility: z.enum(["public", "network", "org"]).optional(),
});

export const ReferralCreateExpectedOutcomeSchema = z.object({
  entity_type: z.literal("referral"),
  title: z.string(),
  created: z.literal(true),
});

export const ReferralCreateActionSchema = BaseActionSchema.extend({
  type: z.literal("referral.create"),
  payload: ReferralCreatePayloadSchema,
  expected_outcome: ReferralCreateExpectedOutcomeSchema,
});

// ============================================================================
// Union Action Type
// ============================================================================

export const ActionSchema = z.discriminatedUnion("type", [
  LeadCreateActionSchema,
  LeadUpdateActionSchema,
  LeadDeleteActionSchema,
  LeadDeleteAllActionSchema,
  DealCreateActionSchema,
  DealUpdateActionSchema,
  DealMoveStageActionSchema,
  DealDeleteActionSchema,
  DealDeleteAllActionSchema,
  TaskCreateActionSchema,
  TaskCompleteActionSchema,
  TaskDeleteActionSchema,
  TaskDeleteAllActionSchema,
  NoteAppendActionSchema,
  NoteDeleteActionSchema,
  CrmSearchActionSchema,
  EmailSendActionSchema,
  SmsSendActionSchema,
  ReferralCreateActionSchema,
  AdsCreateCampaignActionSchema,
  AdsCheckPerformanceActionSchema,
  AdsPauseCampaignActionSchema,
  AdsResumeCampaignActionSchema,
]);

export type Action = z.infer<typeof ActionSchema>;
export type ActionType = Action["type"];

// ============================================================================
// Action Plan Schema
// ============================================================================

export const PlanStepSchema = z.object({
  step_number: z.number().int().min(1),
  description: z.string(),
  action_refs: z.array(z.string().uuid()), // References to action_ids
});

export const VerificationStepSchema = z.object({
  step_number: z.number().int().min(1),
  description: z.string(),
  query: z.string(), // What to check in DB
  expected: z.string(), // Expected result
});

export const ActionPlanSchema = z.object({
  plan_id: z.string().uuid(),
  intent: z.string(),
  confidence: z.number().min(0).max(1),
  plan_steps: z.array(PlanStepSchema),
  actions: z.array(ActionSchema),
  verification_steps: z.array(VerificationStepSchema),
  user_summary: z.string(),
  follow_up_question: z.string().nullable(),
  requires_approval: z.boolean(),
  highest_risk_tier: RiskTier,
});

export type ActionPlan = z.infer<typeof ActionPlanSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the risk tier for an action type
 */
export function getRiskTier(actionType: ActionType): RiskTier {
  switch (actionType) {
    // Tier 0: Read-only
    case "crm.search":
    case "ads.check_performance":
      return 0;
    // Tier 1: Mutations with undo capability
    case "lead.create":
    case "lead.update":
    case "deal.create":
    case "deal.update":
    case "deal.moveStage":
    case "task.create":
    case "task.complete":
    case "note.append":
    case "referral.create":
    case "lead.delete":
    case "deal.delete":
    case "task.delete":
    case "note.delete":
    case "ads.pause_campaign":
    case "ads.resume_campaign":
      return 1;
    // Tier 2: Destructive bulk actions + external communications + spending money
    case "lead.deleteAll":
    case "deal.deleteAll":
    case "task.deleteAll":
    case "email.send":
    case "sms.send":
    case "ads.create_campaign":
      return 2;
    default:
      return 2;
  }
}

/**
 * Check if action type requires approval
 */
export function requiresApproval(actionType: ActionType): boolean {
  return getRiskTier(actionType) === 2;
}

/**
 * Validate an action and return typed result
 */
export function validateAction(
  action: unknown
): { success: true; data: Action } | { success: false; error: z.ZodError } {
  const result = ActionSchema.safeParse(action);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validate an action plan
 */
export function validateActionPlan(
  plan: unknown
): { success: true; data: ActionPlan } | { success: false; error: z.ZodError } {
  const result = ActionPlanSchema.safeParse(plan);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Generate an idempotency key for an action
 */
export function generateIdempotencyKey(
  userId: string,
  actionType: ActionType,
  payloadHash: string
): string {
  return `${userId}:${actionType}:${payloadHash}`;
}

/**
 * Get human-readable description for an action
 */
export function getActionDescription(action: Action): string {
  switch (action.type) {
    case "lead.create":
      return `Create lead: ${action.payload.name}`;
    case "lead.update":
      return `Update lead ${action.payload.id}`;
    case "deal.create":
      return `Create deal: ${action.payload.title}`;
    case "deal.update":
      return `Update deal ${action.payload.id}`;
    case "deal.moveStage":
      return `Move deal ${action.payload.id} from ${action.payload.from_stage} to ${action.payload.to_stage}`;
    case "task.create":
      return `Create task: ${action.payload.title}`;
    case "task.complete":
      return `Complete task ${action.payload.id}`;
    case "note.append":
      return `Add note${action.payload.contactId ? ` to contact ${action.payload.contactId}` : ""}`;
    case "crm.search":
      return `Search ${action.payload.entity}: "${action.payload.query}"`;
    case "email.send":
      return `Send email: ${action.payload.subject}`;
    case "sms.send":
      return `Send SMS to contact ${action.payload.contactId}`;
    case "referral.create":
      return `Post referral: ${action.payload.title}`;
    case "lead.delete":
      return `Delete contact${action.payload.name ? `: ${action.payload.name}` : ""}`;
    case "lead.deleteAll":
      return "Delete all contacts";
    case "deal.delete":
      return `Delete deal${action.payload.title ? `: ${action.payload.title}` : ""}`;
    case "deal.deleteAll":
      return "Delete all deals";
    case "task.delete":
      return `Delete task${action.payload.title ? `: ${action.payload.title}` : ""}`;
    case "task.deleteAll":
      return "Delete all tasks";
    case "note.delete":
      return `Delete note ${action.payload.id}`;
    case "ads.create_campaign":
      return `Create ad campaign: ${action.payload.name || "new campaign"}`;
    case "ads.check_performance":
      return `Check ad performance${action.payload.campaign_name ? `: ${action.payload.campaign_name}` : ""}`;
    case "ads.pause_campaign":
      return `Pause campaign: ${action.payload.campaign_name}`;
    case "ads.resume_campaign":
      return `Resume campaign: ${action.payload.campaign_name}`;
    default:
      return "Unknown action";
  }
}

