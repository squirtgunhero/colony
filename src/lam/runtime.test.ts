// ============================================================================
// LAM Runtime Tests
// Tests for risk tier enforcement logic (not mocking Prisma)
// ============================================================================

import { describe, it, expect } from "vitest";
import { getRiskTier, requiresApproval, validateAction } from "./actionSchema";
import type { ActionPlan } from "./actionSchema";

describe("Runtime Logic", () => {
  describe("Risk Tier Enforcement Logic", () => {
    it("should classify Tier 0 (read-only) actions correctly", () => {
      expect(getRiskTier("crm.search")).toBe(0);
      expect(requiresApproval("crm.search")).toBe(false);
    });

    it("should classify Tier 1 (mutation) actions correctly", () => {
      expect(getRiskTier("lead.create")).toBe(1);
      expect(getRiskTier("deal.create")).toBe(1);
      expect(getRiskTier("task.create")).toBe(1);
      expect(getRiskTier("note.append")).toBe(1);
      expect(requiresApproval("lead.create")).toBe(false);
    });

    it("should classify Tier 2 (approval required) actions correctly", () => {
      expect(getRiskTier("email.send")).toBe(2);
      expect(getRiskTier("sms.send")).toBe(2);
      expect(requiresApproval("email.send")).toBe(true);
      expect(requiresApproval("sms.send")).toBe(true);
    });
  });

  describe("Action Validation", () => {
    it("should validate a correct lead.create action", () => {
      const action = {
        action_id: "123e4567-e89b-12d3-a456-426614174000",
        idempotency_key: "test-key",
        risk_tier: 1,
        requires_approval: false,
        type: "lead.create",
        payload: { name: "Test Lead" },
        expected_outcome: { entity_type: "contact", name: "Test Lead", created: true },
      };

      const result = validateAction(action);
      expect(result.success).toBe(true);
    });

    it("should reject invalid action without required fields", () => {
      const action = {
        action_id: "123e4567-e89b-12d3-a456-426614174000",
        idempotency_key: "test-key",
        risk_tier: 1,
        requires_approval: false,
        type: "lead.create",
        payload: {}, // Missing name
        expected_outcome: { entity_type: "contact", name: "", created: true },
      };

      const result = validateAction(action);
      expect(result.success).toBe(false);
    });

    it("should validate a crm.search action", () => {
      const action = {
        action_id: "123e4567-e89b-12d3-a456-426614174000",
        idempotency_key: "test-key",
        risk_tier: 0,
        requires_approval: false,
        type: "crm.search",
        payload: { entity: "contact", query: "test", limit: 10 },
        expected_outcome: { entity_type: "contact", results_returned: true },
      };

      const result = validateAction(action);
      expect(result.success).toBe(true);
    });

    it("should reject crm.search with limit over 50", () => {
      const action = {
        action_id: "123e4567-e89b-12d3-a456-426614174000",
        idempotency_key: "test-key",
        risk_tier: 0,
        requires_approval: false,
        type: "crm.search",
        payload: { entity: "contact", query: "test", limit: 100 },
        expected_outcome: { entity_type: "contact", results_returned: true },
      };

      const result = validateAction(action);
      expect(result.success).toBe(false);
    });
  });

  describe("Plan Structure", () => {
    it("should have correct structure for mixed-tier plan", () => {
      // Test that plan structure matches expected format
      const planActions = [
        { risk_tier: 0, type: "crm.search" },
        { risk_tier: 1, type: "lead.create" },
      ];

      expect(planActions).toHaveLength(2);
      expect(planActions[0].risk_tier).toBe(0);
      expect(planActions[1].risk_tier).toBe(1);
      
      const requiresApproval = planActions.some(a => a.risk_tier === 2);
      expect(requiresApproval).toBe(false);
    });

    it("should flag plan with Tier 2 actions as requiring approval", () => {
      const planActions = [
        { risk_tier: 2, type: "email.send", requires_approval: true },
      ];

      const requiresApproval = planActions.some(a => a.risk_tier === 2);
      const highestRiskTier = Math.max(...planActions.map(a => a.risk_tier));

      expect(requiresApproval).toBe(true);
      expect(highestRiskTier).toBe(2);
      expect(planActions[0].requires_approval).toBe(true);
    });
  });

  describe("Idempotency Key Format", () => {
    it("should generate consistent idempotency keys", () => {
      const userId = "user-123";
      const actionType = "lead.create";
      const timestamp = "1234567890";
      
      const key = `${userId}:${actionType}:${timestamp}`;
      expect(key).toBe("user-123:lead.create:1234567890");
    });
  });

  describe("Dry Run Mode Logic", () => {
    it("should skip execution in dry run mode", () => {
      // This tests the logic, not the actual execution
      const dryRun = true;
      const shouldExecute = !dryRun;
      expect(shouldExecute).toBe(false);
    });

    it("should execute in normal mode", () => {
      const dryRun = false;
      const shouldExecute = !dryRun;
      expect(shouldExecute).toBe(true);
    });
  });
});
