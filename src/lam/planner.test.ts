// ============================================================================
// LAM Planner Tests
// Tests forceAdRouting (via planFromMessage), createSimplePlan, createFollowUpPlan
// ============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockComplete } = vi.hoisted(() => {
  const mockComplete = vi.fn();
  return { mockComplete };
});

vi.mock("@/lam/llm", () => ({
  getDefaultProvider: vi.fn(() => ({
    name: "mock",
    complete: mockComplete,
    completeJSON: vi.fn(),
  })),
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import {
  planFromMessage,
  createSimplePlan,
  createFollowUpPlan,
  type PlannerInput,
} from "./planner";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function llmResponse(content: string) {
  return {
    content,
    usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    finishReason: "stop" as const,
  };
}

const USER_ID = "user-planner-test";

/**
 * Create a planner JSON where LLM misroutes an ad request as lead.create
 */
function misroutedAdPlan(overrides: Partial<{ name: string; email: string }> = {}) {
  return JSON.stringify({
    intent: "Create a new lead",
    confidence: 0.95,
    actions: [
      {
        type: "lead.create",
        idempotency_key: "test:lead.create:1",
        payload: {
          name: overrides.name || "Miami Listings Lead",
          email: overrides.email || "lead@example.com",
        },
      },
    ],
    user_summary: "I'll create a new lead.",
    follow_up_question: null,
  });
}

/**
 * Build a PlannerInput with conversation history prepended
 */
function inputWithHistory(
  history: string,
  newMessage: string
): PlannerInput {
  return {
    user_message: `${history}\n\nNew message: ${newMessage}`,
    user_id: USER_ID,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Planner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // createSimplePlan
  // =========================================================================

  describe("createSimplePlan", () => {
    it("should create a valid plan for lead.create", () => {
      const plan = createSimplePlan(
        "lead.create",
        { name: "Jane Doe", email: "jane@test.com" },
        USER_ID
      );

      expect(plan.actions).toHaveLength(1);
      expect(plan.actions[0].type).toBe("lead.create");
      expect(plan.actions[0].payload).toEqual({ name: "Jane Doe", email: "jane@test.com" });
      expect(plan.actions[0].risk_tier).toBe(1);
      expect(plan.actions[0].requires_approval).toBe(false);
      expect(plan.confidence).toBe(1.0);
      expect(plan.requires_approval).toBe(false);
      expect(plan.highest_risk_tier).toBe(1);
    });

    it("should create a plan with approval for email.send", () => {
      const plan = createSimplePlan(
        "email.send",
        { contactId: "c1", subject: "Hi", body: "Hello" },
        USER_ID
      );

      expect(plan.actions[0].risk_tier).toBe(2);
      expect(plan.actions[0].requires_approval).toBe(true);
      expect(plan.requires_approval).toBe(true);
      expect(plan.highest_risk_tier).toBe(2);
    });

    it("should create a plan with tier 0 for crm.search", () => {
      const plan = createSimplePlan(
        "crm.search",
        { entity: "contact", query: "john" },
        USER_ID
      );

      expect(plan.actions[0].risk_tier).toBe(0);
      expect(plan.requires_approval).toBe(false);
      expect(plan.highest_risk_tier).toBe(0);
    });

    it("should include plan_steps and verification_steps", () => {
      const plan = createSimplePlan("task.create", { title: "Follow up" }, USER_ID);

      expect(plan.plan_steps).toHaveLength(1);
      expect(plan.plan_steps[0].step_number).toBe(1);
      expect(plan.plan_steps[0].action_refs).toContain(plan.actions[0].action_id);
      expect(plan.verification_steps).toHaveLength(1);
    });

    it("should generate unique IDs", () => {
      const plan1 = createSimplePlan("lead.create", { name: "A" }, USER_ID);
      const plan2 = createSimplePlan("lead.create", { name: "B" }, USER_ID);

      expect(plan1.plan_id).not.toBe(plan2.plan_id);
      expect(plan1.actions[0].action_id).not.toBe(plan2.actions[0].action_id);
    });
  });

  // =========================================================================
  // createFollowUpPlan
  // =========================================================================

  describe("createFollowUpPlan", () => {
    it("should create a plan with follow-up question and no actions", () => {
      const plan = createFollowUpPlan(
        "Which John do you mean?",
        "Disambiguate contact",
        USER_ID
      );

      expect(plan.actions).toHaveLength(0);
      expect(plan.follow_up_question).toBe("Which John do you mean?");
      expect(plan.intent).toBe("Disambiguate contact");
      expect(plan.confidence).toBe(0.5);
      expect(plan.requires_approval).toBe(false);
      expect(plan.highest_risk_tier).toBe(0);
    });

    it("should have empty plan_steps and verification_steps", () => {
      const plan = createFollowUpPlan("What email?", "Need more info", USER_ID);

      expect(plan.plan_steps).toHaveLength(0);
      expect(plan.verification_steps).toHaveLength(0);
    });
  });

  // =========================================================================
  // forceAdRouting (tested via planFromMessage)
  // =========================================================================

  describe("forceAdRouting", () => {
    it("should reroute 'listings in Miami under $500k' from lead.create to ads.create_campaign", async () => {
      mockComplete.mockResolvedValueOnce(llmResponse(misroutedAdPlan()));

      const result = await planFromMessage({
        user_message: "New message: promote listings in Miami under $500k",
        user_id: USER_ID,
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      // Should have been rerouted to ads.create_campaign
      expect(result.plan.actions).toHaveLength(1);
      expect(result.plan.actions[0].type).toBe("ads.create_campaign");
      expect(result.plan.requires_approval).toBe(true);
      expect(result.plan.highest_risk_tier).toBe(2);
    });

    it("should extract city and price from 'homes in Austin under $400k'", async () => {
      mockComplete.mockResolvedValueOnce(llmResponse(misroutedAdPlan()));

      const result = await planFromMessage({
        user_message: "New message: advertise homes in Austin under $400k",
        user_id: USER_ID,
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      const payload = result.plan.actions[0].payload as Record<string, unknown>;
      // forceAdRouting lowercases the entire message before regex extraction
      expect(payload.target_city?.toString().toLowerCase()).toBe("austin");
      expect(payload.target_price_max).toBe(400000);
      expect(payload.listing_focus).toBe(true);
      expect(payload.channel).toBe("meta");
    });

    it("should extract bedrooms from 'promote 3 bed homes in Denver under $600k'", async () => {
      mockComplete.mockResolvedValueOnce(llmResponse(misroutedAdPlan()));

      const result = await planFromMessage({
        user_message: "New message: promote 3 bed homes in Denver under $600k",
        user_id: USER_ID,
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      const payload = result.plan.actions[0].payload as Record<string, unknown>;
      expect(payload.target_bedrooms_min).toBe(3);
      expect(payload.target_city?.toString().toLowerCase()).toBe("denver");
    });

    it("should NOT reroute when already classified as ads.create_campaign", async () => {
      const correctPlan = JSON.stringify({
        intent: "Create ad campaign",
        confidence: 0.95,
        actions: [
          {
            type: "ads.create_campaign",
            idempotency_key: "test:ads:1",
            payload: { objective: "LEADS", daily_budget: 10 },
          },
        ],
        user_summary: "Creating campaign.",
        follow_up_question: null,
      });

      mockComplete.mockResolvedValueOnce(llmResponse(correctPlan));

      const result = await planFromMessage({
        user_message: "New message: run an ad for listings in Miami",
        user_id: USER_ID,
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      // Should stay as ads.create_campaign (not duplicated)
      const adActions = result.plan.actions.filter(a => a.type === "ads.create_campaign");
      expect(adActions).toHaveLength(1);
    });

    it("should NOT reroute when there's no ad intent", async () => {
      const normalPlan = JSON.stringify({
        intent: "Create a lead",
        confidence: 0.95,
        actions: [
          {
            type: "lead.create",
            idempotency_key: "test:lead:1",
            payload: { name: "Sarah Connor", email: "sarah@test.com" },
          },
        ],
        user_summary: "Adding Sarah.",
        follow_up_question: null,
      });

      mockComplete.mockResolvedValueOnce(llmResponse(normalPlan));

      const result = await planFromMessage({
        user_message: "New message: add sarah connor as a new lead",
        user_id: USER_ID,
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.plan.actions[0].type).toBe("lead.create");
    });

    // ── Guided flow skip tests (the recent fix) ──

    it("should NOT reroute mid-flow budget answer when in guided ad builder", async () => {
      mockComplete.mockResolvedValueOnce(llmResponse(misroutedAdPlan()));

      const result = await planFromMessage(
        inputWithHistory(
          "Assistant: What budget would you like for the campaign?",
          "$15/day"
        )
      );

      expect(result.success).toBe(true);
      if (!result.success) return;

      // Should NOT have been rerouted - it's a mid-flow answer
      expect(result.plan.actions[0].type).toBe("lead.create");
    });

    it("should NOT reroute mid-flow image description when in guided flow", async () => {
      mockComplete.mockResolvedValueOnce(llmResponse(misroutedAdPlan()));

      const result = await planFromMessage(
        inputWithHistory(
          "Assistant: What image would you like for the ad?",
          "an image of a modern kitchen with marble countertops"
        )
      );

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.plan.actions[0].type).toBe("lead.create");
    });

    it("should NOT reroute 'seller' lead type answer in guided flow", async () => {
      mockComplete.mockResolvedValueOnce(llmResponse(misroutedAdPlan()));

      const result = await planFromMessage(
        inputWithHistory(
          "Assistant: What kind of leads? Seller leads or buyer leads?",
          "seller leads"
        )
      );

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.plan.actions[0].type).toBe("lead.create");
    });

    it("should NOT reroute confirmation answers in guided flow", async () => {
      mockComplete.mockResolvedValueOnce(llmResponse(misroutedAdPlan()));

      const result = await planFromMessage(
        inputWithHistory(
          "Assistant: Would you like to use this image for the campaign?",
          "yes"
        )
      );

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.plan.actions[0].type).toBe("lead.create");
    });

    it("should NOT reroute questions about ad setup", async () => {
      mockComplete.mockResolvedValueOnce(llmResponse(misroutedAdPlan()));

      const result = await planFromMessage({
        user_message: "New message: what targeting options are available?",
        user_id: USER_ID,
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      // Question about ad setup should not trigger rerouting
      expect(result.plan.actions[0].type).toBe("lead.create");
    });

    it("should handle 'run an ad' keyword correctly", async () => {
      mockComplete.mockResolvedValueOnce(llmResponse(misroutedAdPlan()));

      const result = await planFromMessage({
        user_message: "New message: run an ad for my properties",
        user_id: USER_ID,
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.plan.actions[0].type).toBe("ads.create_campaign");
    });

    it("should handle price with 'k' multiplier (e.g., $500k)", async () => {
      mockComplete.mockResolvedValueOnce(llmResponse(misroutedAdPlan()));

      const result = await planFromMessage({
        user_message: "New message: promote listings in Tampa under $500k",
        user_id: USER_ID,
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      const payload = result.plan.actions[0].payload as Record<string, unknown>;
      expect(payload.target_price_max).toBe(500000);
    });

    it("should handle price with 'm' multiplier (e.g., $1.5m)", async () => {
      mockComplete.mockResolvedValueOnce(llmResponse(misroutedAdPlan()));

      const result = await planFromMessage({
        user_message: "New message: advertise homes in Beverly Hills under $1.5m",
        user_id: USER_ID,
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      const payload = result.plan.actions[0].payload as Record<string, unknown>;
      expect(payload.target_price_max).toBe(1500000);
    });
  });

  // =========================================================================
  // postProcessPlan (tested via planFromMessage)
  // =========================================================================

  describe("postProcessPlan", () => {
    it("should enforce correct risk tiers even if LLM provides wrong ones", async () => {
      const wrongTierPlan = JSON.stringify({
        intent: "Send email",
        confidence: 0.9,
        actions: [
          {
            type: "email.send",
            risk_tier: 0, // LLM says tier 0, but email.send is tier 2
            requires_approval: false,
            idempotency_key: "test:email:1",
            payload: { contactId: "c1", subject: "Hi", body: "Hello" },
          },
        ],
        user_summary: "Sending email.",
        follow_up_question: null,
      });

      mockComplete.mockResolvedValueOnce(llmResponse(wrongTierPlan));

      const result = await planFromMessage({
        user_message: "New message: email john hello",
        user_id: USER_ID,
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      // postProcessPlan should have corrected the risk tier
      expect(result.plan.actions[0].risk_tier).toBe(2);
      expect(result.plan.actions[0].requires_approval).toBe(true);
      expect(result.plan.highest_risk_tier).toBe(2);
      expect(result.plan.requires_approval).toBe(true);
    });

    it("should generate plan_id if missing", async () => {
      const noPlanId = JSON.stringify({
        intent: "Search contacts",
        confidence: 0.9,
        actions: [
          {
            type: "crm.search",
            idempotency_key: "test:search:1",
            payload: { entity: "contact", query: "test" },
          },
        ],
        user_summary: "Searching.",
        follow_up_question: null,
      });

      mockComplete.mockResolvedValueOnce(llmResponse(noPlanId));

      const result = await planFromMessage({
        user_message: "New message: search contacts",
        user_id: USER_ID,
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.plan.plan_id).toBeDefined();
      expect(result.plan.plan_id.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Error handling
  // =========================================================================

  describe("Error Handling", () => {
    it("should return error when LLM fails", async () => {
      mockComplete.mockRejectedValueOnce(new Error("API rate limit exceeded"));

      const result = await planFromMessage({
        user_message: "New message: add a lead",
        user_id: USER_ID,
      });

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toContain("rate limit");
      expect(result.code).toBe("LLM_ERROR");
    });

    it("should return error for empty message", async () => {
      const result = await planFromMessage({
        user_message: "",
        user_id: USER_ID,
      });

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.code).toBe("INVALID_INPUT");
    });
  });
});
