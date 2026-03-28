// ============================================================================
// LAM LLM Parser Tests
// Tests normalization of lenient LLM responses to strict ActionPlan schema
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  normalizeLLMResponse,
  LenientActionPlanSchema,
} from "./llmParser";

const USER_ID = "user-parser-test";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("LLM Parser", () => {
  // =========================================================================
  // LenientActionPlanSchema
  // =========================================================================

  describe("LenientActionPlanSchema", () => {
    it("should accept minimal valid plan", () => {
      const result = LenientActionPlanSchema.safeParse({
        intent: "Create lead",
        confidence: 0.9,
        actions: [
          { type: "lead.create", payload: { name: "Test" } },
        ],
        user_summary: "Creating lead.",
      });

      expect(result.success).toBe(true);
    });

    it("should accept confidence as string", () => {
      const result = LenientActionPlanSchema.safeParse({
        intent: "Search",
        confidence: "0.8",
        actions: [],
        user_summary: "Searching.",
      });

      expect(result.success).toBe(true);
    });

    it("should accept risk_tier as string", () => {
      const result = LenientActionPlanSchema.safeParse({
        intent: "Create",
        confidence: 0.9,
        actions: [
          { type: "lead.create", risk_tier: "1", payload: { name: "X" } },
        ],
        user_summary: "Creating.",
      });

      expect(result.success).toBe(true);
    });

    it("should reject missing intent", () => {
      const result = LenientActionPlanSchema.safeParse({
        confidence: 0.9,
        actions: [],
        user_summary: "Missing intent.",
      });

      expect(result.success).toBe(false);
    });

    it("should reject missing user_summary", () => {
      const result = LenientActionPlanSchema.safeParse({
        intent: "Test",
        confidence: 0.9,
        actions: [],
      });

      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // normalizeLLMResponse
  // =========================================================================

  describe("normalizeLLMResponse", () => {
    it("should generate UUIDs for all action IDs", () => {
      const raw = LenientActionPlanSchema.parse({
        intent: "Create lead",
        confidence: 0.9,
        actions: [
          { type: "lead.create", payload: { name: "Alice" } },
        ],
        user_summary: "Creating Alice.",
      });

      const plan = normalizeLLMResponse(raw, USER_ID);

      expect(plan.actions[0].action_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it("should generate unique plan_id", () => {
      const raw = LenientActionPlanSchema.parse({
        intent: "Test",
        confidence: 0.9,
        actions: [],
        user_summary: "Test.",
      });

      const plan = normalizeLLMResponse(raw, USER_ID);

      expect(plan.plan_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it("should preserve valid plan_id if provided", () => {
      const validUUID = "123e4567-e89b-12d3-a456-426614174000";
      const raw = LenientActionPlanSchema.parse({
        plan_id: validUUID,
        intent: "Test",
        confidence: 0.9,
        actions: [],
        user_summary: "Test.",
      });

      const plan = normalizeLLMResponse(raw, USER_ID);
      expect(plan.plan_id).toBe(validUUID);
    });

    it("should replace invalid plan_id with UUID", () => {
      const raw = LenientActionPlanSchema.parse({
        plan_id: "not-a-uuid",
        intent: "Test",
        confidence: 0.9,
        actions: [],
        user_summary: "Test.",
      });

      const plan = normalizeLLMResponse(raw, USER_ID);
      expect(plan.plan_id).not.toBe("not-a-uuid");
      expect(plan.plan_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it("should convert string confidence to number", () => {
      const raw = LenientActionPlanSchema.parse({
        intent: "Test",
        confidence: "0.75",
        actions: [],
        user_summary: "Test.",
      });

      const plan = normalizeLLMResponse(raw, USER_ID);
      expect(plan.confidence).toBe(0.75);
      expect(typeof plan.confidence).toBe("number");
    });

    it("should set correct risk tiers based on action type", () => {
      const raw = LenientActionPlanSchema.parse({
        intent: "Mixed",
        confidence: 0.9,
        actions: [
          { type: "crm.search", payload: { entity: "contact", query: "" } },
          { type: "lead.create", payload: { name: "X" } },
          { type: "email.send", payload: { contactId: "c1", subject: "Hi", body: "Hello" } },
        ],
        user_summary: "Mixed actions.",
      });

      const plan = normalizeLLMResponse(raw, USER_ID);

      expect(plan.actions[0].risk_tier).toBe(0); // crm.search
      expect(plan.actions[1].risk_tier).toBe(1); // lead.create
      expect(plan.actions[2].risk_tier).toBe(2); // email.send
    });

    it("should calculate highest_risk_tier correctly", () => {
      const raw = LenientActionPlanSchema.parse({
        intent: "Mixed",
        confidence: 0.9,
        actions: [
          { type: "crm.search", payload: { entity: "contact", query: "" } },
          { type: "email.send", payload: { contactId: "c1", subject: "Hi", body: "Hello" } },
        ],
        user_summary: "Mixed.",
      });

      const plan = normalizeLLMResponse(raw, USER_ID);
      expect(plan.highest_risk_tier).toBe(2);
      expect(plan.requires_approval).toBe(true);
    });

    it("should set requires_approval=false when no tier 2 actions", () => {
      const raw = LenientActionPlanSchema.parse({
        intent: "Create",
        confidence: 0.9,
        actions: [
          { type: "lead.create", payload: { name: "X" } },
        ],
        user_summary: "Creating.",
      });

      const plan = normalizeLLMResponse(raw, USER_ID);
      expect(plan.requires_approval).toBe(false);
    });

    it("should create default plan_steps when none provided", () => {
      const raw = LenientActionPlanSchema.parse({
        intent: "Create lead",
        confidence: 0.9,
        actions: [
          { type: "lead.create", payload: { name: "Bob" } },
          { type: "task.create", payload: { title: "Follow up" } },
        ],
        user_summary: "Creating lead and task.",
      });

      const plan = normalizeLLMResponse(raw, USER_ID);
      expect(plan.plan_steps).toHaveLength(2);
      expect(plan.plan_steps[0].step_number).toBe(1);
      expect(plan.plan_steps[1].step_number).toBe(2);
    });

    it("should set follow_up_question to null when not provided", () => {
      const raw = LenientActionPlanSchema.parse({
        intent: "Test",
        confidence: 0.9,
        actions: [],
        user_summary: "Test.",
      });

      const plan = normalizeLLMResponse(raw, USER_ID);
      expect(plan.follow_up_question).toBeNull();
    });

    it("should preserve follow_up_question when provided", () => {
      const raw = LenientActionPlanSchema.parse({
        intent: "Ambiguous",
        confidence: 0.5,
        actions: [],
        user_summary: "Need more info.",
        follow_up_question: "Which contact?",
      });

      const plan = normalizeLLMResponse(raw, USER_ID);
      expect(plan.follow_up_question).toBe("Which contact?");
    });

    it("should generate idempotency keys when missing", () => {
      const raw = LenientActionPlanSchema.parse({
        intent: "Create",
        confidence: 0.9,
        actions: [
          { type: "lead.create", payload: { name: "Test" } },
        ],
        user_summary: "Creating.",
      });

      const plan = normalizeLLMResponse(raw, USER_ID);
      expect(plan.actions[0].idempotency_key).toContain(USER_ID);
      expect(plan.actions[0].idempotency_key).toContain("lead.create");
    });
  });

  // =========================================================================
  // normalizeActionType (tested via normalizeLLMResponse)
  // =========================================================================

  describe("Action type normalization", () => {
    const testCases: Array<{ input: string; expected: string }> = [
      { input: "lead.create", expected: "lead.create" },
      { input: "create_lead", expected: "lead.create" },
      { input: "createLead", expected: "lead.create" },
      { input: "contact.create", expected: "lead.create" },
      { input: "contact.update", expected: "lead.update" },
      { input: "create_deal", expected: "deal.create" },
      { input: "createDeal", expected: "deal.create" },
      { input: "move_stage", expected: "deal.moveStage" },
      { input: "moveStage", expected: "deal.moveStage" },
      { input: "create_task", expected: "task.create" },
      { input: "complete_task", expected: "task.complete" },
      { input: "add_note", expected: "note.append" },
      { input: "append_note", expected: "note.append" },
      { input: "search", expected: "crm.search" },
      { input: "send_email", expected: "email.send" },
      { input: "sendEmail", expected: "email.send" },
      { input: "send_sms", expected: "sms.send" },
    ];

    for (const { input, expected } of testCases) {
      it(`should normalize '${input}' to '${expected}'`, () => {
        const raw = LenientActionPlanSchema.parse({
          intent: "Test",
          confidence: 0.9,
          actions: [{ type: input, payload: { name: "X" } }],
          user_summary: "Test.",
        });

        const plan = normalizeLLMResponse(raw, USER_ID);
        expect(plan.actions[0].type).toBe(expected);
      });
    }
  });

  // =========================================================================
  // normalizePayload (tested via normalizeLLMResponse)
  // =========================================================================

  describe("Payload normalization", () => {
    it("should normalize lead.create with alternate field names", () => {
      const raw = LenientActionPlanSchema.parse({
        intent: "Create",
        confidence: 0.9,
        actions: [
          {
            type: "lead.create",
            payload: {
              fullName: "John Doe",      // should map to name
              phoneNumber: "555-0100",     // should map to phone
              description: "VIP client",   // should map to notes
            },
          },
        ],
        user_summary: "Creating.",
      });

      const plan = normalizeLLMResponse(raw, USER_ID);
      const p = plan.actions[0].payload as Record<string, unknown>;

      expect(p.name).toBe("John Doe");
      expect(p.phone).toBe("555-0100");
      expect(p.notes).toBe("VIP client");
    });

    it("should normalize deal.create with alternate field names", () => {
      const raw = LenientActionPlanSchema.parse({
        intent: "Create deal",
        confidence: 0.9,
        actions: [
          {
            type: "deal.create",
            payload: {
              name: "Big Deal",           // should map to title
              amount: 100000,             // should map to value
              contact_id: "c-123",        // should map to contactId
            },
          },
        ],
        user_summary: "Creating deal.",
      });

      const plan = normalizeLLMResponse(raw, USER_ID);
      const p = plan.actions[0].payload as Record<string, unknown>;

      expect(p.title).toBe("Big Deal");
      expect(p.value).toBe(100000);
      expect(p.contactId).toBe("c-123");
    });

    it("should normalize task.create with alternate field names", () => {
      const raw = LenientActionPlanSchema.parse({
        intent: "Create task",
        confidence: 0.9,
        actions: [
          {
            type: "task.create",
            payload: {
              name: "Follow up",           // should map to title
              due_date: "2025-03-01",      // should map to dueDate
              contact_id: "c-456",         // should map to contactId
            },
          },
        ],
        user_summary: "Creating task.",
      });

      const plan = normalizeLLMResponse(raw, USER_ID);
      const p = plan.actions[0].payload as Record<string, unknown>;

      expect(p.title).toBe("Follow up");
      expect(p.dueDate).toBe("2025-03-01");
      expect(p.contactId).toBe("c-456");
    });

    it("should normalize crm.search with alternate field names", () => {
      const raw = LenientActionPlanSchema.parse({
        intent: "Search",
        confidence: 0.9,
        actions: [
          {
            type: "crm.search",
            payload: {
              entity_type: "deal",    // should map to entity
              q: "renovation",        // should map to query
            },
          },
        ],
        user_summary: "Searching.",
      });

      const plan = normalizeLLMResponse(raw, USER_ID);
      const p = plan.actions[0].payload as Record<string, unknown>;

      expect(p.entity).toBe("deal");
      expect(p.query).toBe("renovation");
    });

    it("should normalize note.append with alternate field names", () => {
      const raw = LenientActionPlanSchema.parse({
        intent: "Add note",
        confidence: 0.9,
        actions: [
          {
            type: "note.append",
            payload: {
              content: "Important meeting notes",
              lead_id: "c-789",
            },
          },
        ],
        user_summary: "Adding note.",
      });

      const plan = normalizeLLMResponse(raw, USER_ID);
      const p = plan.actions[0].payload as Record<string, unknown>;

      expect(p.body).toBe("Important meeting notes");
      expect(p.contactId).toBe("c-789");
    });

    it("should default lead name to 'Unknown' when missing", () => {
      const raw = LenientActionPlanSchema.parse({
        intent: "Create",
        confidence: 0.9,
        actions: [
          { type: "lead.create", payload: { email: "test@test.com" } },
        ],
        user_summary: "Creating.",
      });

      const plan = normalizeLLMResponse(raw, USER_ID);
      const p = plan.actions[0].payload as Record<string, unknown>;
      expect(p.name).toBe("Unknown");
    });
  });

  // =========================================================================
  // normalizeExpectedOutcome (tested via normalizeLLMResponse)
  // =========================================================================

  describe("Expected outcome normalization", () => {
    it("should set entity_type='contact' for lead.create", () => {
      const raw = LenientActionPlanSchema.parse({
        intent: "Create",
        confidence: 0.9,
        actions: [
          { type: "lead.create", payload: { name: "Test" } },
        ],
        user_summary: "Creating.",
      });

      const plan = normalizeLLMResponse(raw, USER_ID);
      const outcome = plan.actions[0].expected_outcome as Record<string, unknown>;

      expect(outcome.entity_type).toBe("contact");
      expect(outcome.created).toBe(true);
      expect(outcome.name).toBe("Test");
    });

    it("should set entity_type='deal' for deal.create", () => {
      const raw = LenientActionPlanSchema.parse({
        intent: "Create deal",
        confidence: 0.9,
        actions: [
          { type: "deal.create", payload: { title: "My Deal" } },
        ],
        user_summary: "Creating deal.",
      });

      const plan = normalizeLLMResponse(raw, USER_ID);
      const outcome = plan.actions[0].expected_outcome as Record<string, unknown>;

      expect(outcome.entity_type).toBe("deal");
      expect(outcome.title).toBe("My Deal");
    });

    it("should set completed=true for task.complete", () => {
      const raw = LenientActionPlanSchema.parse({
        intent: "Complete task",
        confidence: 0.9,
        actions: [
          { type: "task.complete", payload: { id: "task-1" } },
        ],
        user_summary: "Completing.",
      });

      const plan = normalizeLLMResponse(raw, USER_ID);
      const outcome = plan.actions[0].expected_outcome as Record<string, unknown>;

      expect(outcome.completed).toBe(true);
    });
  });
});
