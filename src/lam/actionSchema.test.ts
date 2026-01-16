// ============================================================================
// LAM Action Schema Tests
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  ActionSchema,
  ActionPlanSchema,
  LeadCreateActionSchema,
  DealCreateActionSchema,
  TaskCreateActionSchema,
  CrmSearchActionSchema,
  validateAction,
  validateActionPlan,
  getRiskTier,
  requiresApproval,
  getActionDescription,
} from "./actionSchema";

describe("Action Schema Validation", () => {
  describe("LeadCreateAction", () => {
    it("should validate a valid lead.create action", () => {
      const action = {
        action_id: "123e4567-e89b-12d3-a456-426614174000",
        idempotency_key: "user123:lead.create:abc123",
        risk_tier: 1,
        requires_approval: false,
        type: "lead.create",
        payload: {
          name: "John Doe",
          email: "john@example.com",
          phone: "+1-555-0100",
          source: "website",
        },
        expected_outcome: {
          entity_type: "contact",
          name: "John Doe",
          created: true,
        },
      };

      const result = LeadCreateActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it("should reject lead.create without name", () => {
      const action = {
        action_id: "123e4567-e89b-12d3-a456-426614174000",
        idempotency_key: "user123:lead.create:abc123",
        risk_tier: 1,
        requires_approval: false,
        type: "lead.create",
        payload: {
          email: "john@example.com",
        },
        expected_outcome: {
          entity_type: "contact",
          name: "",
          created: true,
        },
      };

      const result = LeadCreateActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });

    it("should reject invalid email format", () => {
      const action = {
        action_id: "123e4567-e89b-12d3-a456-426614174000",
        idempotency_key: "user123:lead.create:abc123",
        risk_tier: 1,
        requires_approval: false,
        type: "lead.create",
        payload: {
          name: "John Doe",
          email: "not-an-email",
        },
        expected_outcome: {
          entity_type: "contact",
          name: "John Doe",
          created: true,
        },
      };

      const result = LeadCreateActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });
  });

  describe("DealCreateAction", () => {
    it("should validate a valid deal.create action", () => {
      const action = {
        action_id: "123e4567-e89b-12d3-a456-426614174001",
        idempotency_key: "user123:deal.create:abc123",
        risk_tier: 1,
        requires_approval: false,
        type: "deal.create",
        payload: {
          title: "New Property Deal",
          value: 500000,
          stage: "new_lead",
        },
        expected_outcome: {
          entity_type: "deal",
          title: "New Property Deal",
          created: true,
        },
      };

      const result = DealCreateActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it("should reject invalid stage", () => {
      const action = {
        action_id: "123e4567-e89b-12d3-a456-426614174001",
        idempotency_key: "user123:deal.create:abc123",
        risk_tier: 1,
        requires_approval: false,
        type: "deal.create",
        payload: {
          title: "New Property Deal",
          stage: "invalid_stage",
        },
        expected_outcome: {
          entity_type: "deal",
          title: "New Property Deal",
          created: true,
        },
      };

      const result = DealCreateActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });
  });

  describe("TaskCreateAction", () => {
    it("should validate a valid task.create action", () => {
      const action = {
        action_id: "123e4567-e89b-12d3-a456-426614174002",
        idempotency_key: "user123:task.create:abc123",
        risk_tier: 1,
        requires_approval: false,
        type: "task.create",
        payload: {
          title: "Follow up with client",
          priority: "high",
          dueDate: "2025-02-01T10:00:00Z",
        },
        expected_outcome: {
          entity_type: "task",
          title: "Follow up with client",
          created: true,
        },
      };

      const result = TaskCreateActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });
  });

  describe("CrmSearchAction", () => {
    it("should validate a valid crm.search action", () => {
      const action = {
        action_id: "123e4567-e89b-12d3-a456-426614174003",
        idempotency_key: "user123:crm.search:abc123",
        risk_tier: 0,
        requires_approval: false,
        type: "crm.search",
        payload: {
          entity: "contact",
          query: "John",
          limit: 10,
        },
        expected_outcome: {
          entity_type: "contact",
          results_returned: true,
        },
      };

      const result = CrmSearchActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it("should reject limit over 50", () => {
      const action = {
        action_id: "123e4567-e89b-12d3-a456-426614174003",
        idempotency_key: "user123:crm.search:abc123",
        risk_tier: 0,
        requires_approval: false,
        type: "crm.search",
        payload: {
          entity: "contact",
          query: "John",
          limit: 100,
        },
        expected_outcome: {
          entity_type: "contact",
          results_returned: true,
        },
      };

      const result = CrmSearchActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });
  });

  describe("Discriminated Union", () => {
    it("should correctly parse different action types", () => {
      const searchAction = {
        action_id: "123e4567-e89b-12d3-a456-426614174003",
        idempotency_key: "test",
        risk_tier: 0,
        requires_approval: false,
        type: "crm.search",
        payload: { entity: "contact", query: "test", limit: 10 },
        expected_outcome: { entity_type: "contact", results_returned: true },
      };

      const result = ActionSchema.safeParse(searchAction);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("crm.search");
      }
    });

    it("should reject unknown action types", () => {
      const unknownAction = {
        action_id: "123e4567-e89b-12d3-a456-426614174003",
        idempotency_key: "test",
        risk_tier: 0,
        requires_approval: false,
        type: "unknown.action",
        payload: {},
        expected_outcome: {},
      };

      const result = ActionSchema.safeParse(unknownAction);
      expect(result.success).toBe(false);
    });
  });
});

describe("Risk Tier Functions", () => {
  it("should return tier 0 for crm.search", () => {
    expect(getRiskTier("crm.search")).toBe(0);
  });

  it("should return tier 1 for mutations", () => {
    expect(getRiskTier("lead.create")).toBe(1);
    expect(getRiskTier("deal.create")).toBe(1);
    expect(getRiskTier("task.create")).toBe(1);
    expect(getRiskTier("note.append")).toBe(1);
  });

  it("should return tier 2 for external communications", () => {
    expect(getRiskTier("email.send")).toBe(2);
    expect(getRiskTier("sms.send")).toBe(2);
  });

  it("should require approval for tier 2 only", () => {
    expect(requiresApproval("crm.search")).toBe(false);
    expect(requiresApproval("lead.create")).toBe(false);
    expect(requiresApproval("email.send")).toBe(true);
    expect(requiresApproval("sms.send")).toBe(true);
  });
});

describe("Helper Functions", () => {
  describe("validateAction", () => {
    it("should return success for valid action", () => {
      const action = {
        action_id: "123e4567-e89b-12d3-a456-426614174000",
        idempotency_key: "test",
        risk_tier: 1,
        requires_approval: false,
        type: "lead.create",
        payload: { name: "Test Lead" },
        expected_outcome: { entity_type: "contact", name: "Test Lead", created: true },
      };

      const result = validateAction(action);
      expect(result.success).toBe(true);
    });

    it("should return error for invalid action", () => {
      const action = { type: "invalid" };
      const result = validateAction(action);
      expect(result.success).toBe(false);
    });
  });

  describe("getActionDescription", () => {
    it("should return readable description for lead.create", () => {
      // Using the schema to parse ensures all defaults are applied
      const action = LeadCreateActionSchema.parse({
        action_id: "123e4567-e89b-12d3-a456-426614174000",
        idempotency_key: "test",
        risk_tier: 1,
        requires_approval: false,
        type: "lead.create",
        payload: { name: "John Doe" },
        expected_outcome: { entity_type: "contact", name: "John Doe", created: true },
      });

      expect(getActionDescription(action)).toBe("Create lead: John Doe");
    });

    it("should return readable description for crm.search", () => {
      const action = CrmSearchActionSchema.parse({
        action_id: "123e4567-e89b-12d3-a456-426614174000",
        idempotency_key: "test",
        risk_tier: 0,
        requires_approval: false,
        type: "crm.search",
        payload: { entity: "contact", query: "John", limit: 10 },
        expected_outcome: { entity_type: "contact", results_returned: true },
      });

      expect(getActionDescription(action)).toBe('Search contact: "John"');
    });
  });
});

describe("ActionPlan Schema", () => {
  it("should validate a complete action plan", () => {
    const plan = {
      plan_id: "123e4567-e89b-12d3-a456-426614174000",
      intent: "Create a new lead",
      confidence: 0.95,
      plan_steps: [
        {
          step_number: 1,
          description: "Create the lead",
          action_refs: ["123e4567-e89b-12d3-a456-426614174001"],
        },
      ],
      actions: [
        {
          action_id: "123e4567-e89b-12d3-a456-426614174001",
          idempotency_key: "test",
          risk_tier: 1,
          requires_approval: false,
          type: "lead.create",
          payload: { name: "Test Lead" },
          expected_outcome: { entity_type: "contact", name: "Test Lead", created: true },
        },
      ],
      verification_steps: [
        {
          step_number: 1,
          description: "Verify lead was created",
          query: "SELECT * FROM contacts WHERE name = 'Test Lead'",
          expected: "1 row returned",
        },
      ],
      user_summary: "I'll create a new lead named Test Lead.",
      follow_up_question: null,
      requires_approval: false,
      highest_risk_tier: 1,
    };

    const result = validateActionPlan(plan);
    expect(result.success).toBe(true);
  });

  it("should reject plan with invalid confidence", () => {
    const plan = {
      plan_id: "123e4567-e89b-12d3-a456-426614174000",
      intent: "Create a new lead",
      confidence: 1.5, // Invalid - must be 0-1
      plan_steps: [],
      actions: [],
      verification_steps: [],
      user_summary: "Test",
      follow_up_question: null,
      requires_approval: false,
      highest_risk_tier: 0,
    };

    const result = validateActionPlan(plan);
    expect(result.success).toBe(false);
  });
});

