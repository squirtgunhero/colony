// ============================================================================
// LAM Verifier Tests
// Tests verification logic with mocked Prisma
// ============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    contact: {
      findUnique: vi.fn(),
    },
    deal: {
      findUnique: vi.fn(),
    },
    task: {
      findUnique: vi.fn(),
    },
    note: {
      findUnique: vi.fn(),
    },
  };
  return { mockPrisma };
});

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { verify } from "./verifier";
import type { ActionPlan } from "./actionSchema";
import type { ExecutionResult, ActionResult } from "./runtime";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAction(
  type: string,
  payload: Record<string, unknown>,
  actionId = "action-1"
): ActionPlan["actions"][0] {
  return {
    action_id: actionId,
    idempotency_key: `test:${type}:1`,
    type,
    risk_tier: 1,
    requires_approval: false,
    payload,
    expected_outcome: {},
  } as ActionPlan["actions"][0];
}

function makePlan(actions: ActionPlan["actions"]): ActionPlan {
  return {
    plan_id: "plan-1",
    intent: "Test",
    confidence: 0.9,
    plan_steps: [],
    actions,
    verification_steps: [],
    user_summary: "Test.",
    follow_up_question: null,
    requires_approval: false,
    highest_risk_tier: 1,
  };
}

function makeResult(
  actionId: string,
  status: "success" | "error" | "approval_required" = "success",
  entityId?: string
): ActionResult {
  return {
    action_id: actionId,
    status,
    entity_id: entityId,
    message: status === "success" ? "Done" : "Failed",
  } as ActionResult;
}

function makeExecutionResult(results: ActionResult[]): ExecutionResult {
  return {
    run_id: "run-1",
    status: "completed",
    actions_executed: results.filter(r => r.status === "success").length,
    actions_failed: results.filter(r => r.status === "error").length,
    actions_pending_approval: results.filter(r => r.status === "approval_required").length,
    results,
  } as ExecutionResult;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Verifier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // lead.create verification
  // =========================================================================

  describe("lead.create verification", () => {
    it("should verify when contact exists with matching name", async () => {
      mockPrisma.contact.findUnique.mockResolvedValue({
        id: "c-1",
        name: "John Smith",
      });

      const action = makeAction("lead.create", { name: "John Smith" });
      const plan = makePlan([action]);
      const execResult = makeExecutionResult([
        makeResult("action-1", "success", "c-1"),
      ]);

      const result = await verify(plan, execResult);

      expect(result.status).toBe("verified");
      expect(result.verified_count).toBe(1);
      expect(result.failed_count).toBe(0);
      expect(result.steps[0].status).toBe("verified");
      expect(result.steps[0].match).toBe(true);
    });

    it("should fail when contact not found", async () => {
      mockPrisma.contact.findUnique.mockResolvedValue(null);

      const action = makeAction("lead.create", { name: "Ghost" });
      const plan = makePlan([action]);
      const execResult = makeExecutionResult([
        makeResult("action-1", "success", "c-not-exist"),
      ]);

      const result = await verify(plan, execResult);

      expect(result.status).toBe("failed");
      expect(result.failed_count).toBe(1);
      expect(result.steps[0].status).toBe("failed");
      expect(result.steps[0].actual).toContain("not found");
    });

    it("should fail when name doesn't match", async () => {
      mockPrisma.contact.findUnique.mockResolvedValue({
        id: "c-1",
        name: "Jane Doe", // wrong name
      });

      const action = makeAction("lead.create", { name: "John Smith" });
      const plan = makePlan([action]);
      const execResult = makeExecutionResult([
        makeResult("action-1", "success", "c-1"),
      ]);

      const result = await verify(plan, execResult);

      expect(result.status).toBe("failed");
      expect(result.steps[0].status).toBe("failed");
      expect(result.steps[0].match).toBe(false);
    });

    it("should skip verification when action failed", async () => {
      const action = makeAction("lead.create", { name: "Test" });
      const plan = makePlan([action]);
      const execResult = makeExecutionResult([
        makeResult("action-1", "error"),
      ]);

      const result = await verify(plan, execResult);

      expect(result.steps[0].status).toBe("skipped");
      expect(result.skipped_count).toBe(1);
    });
  });

  // =========================================================================
  // deal.create verification
  // =========================================================================

  describe("deal.create verification", () => {
    it("should verify when deal exists with matching title", async () => {
      mockPrisma.deal.findUnique.mockResolvedValue({
        id: "d-1",
        title: "Big Project",
      });

      const action = makeAction("deal.create", { title: "Big Project" });
      const plan = makePlan([action]);
      const execResult = makeExecutionResult([
        makeResult("action-1", "success", "d-1"),
      ]);

      const result = await verify(plan, execResult);

      expect(result.status).toBe("verified");
      expect(result.steps[0].match).toBe(true);
    });

    it("should fail when deal title doesn't match", async () => {
      mockPrisma.deal.findUnique.mockResolvedValue({
        id: "d-1",
        title: "Wrong Title",
      });

      const action = makeAction("deal.create", { title: "Big Project" });
      const plan = makePlan([action]);
      const execResult = makeExecutionResult([
        makeResult("action-1", "success", "d-1"),
      ]);

      const result = await verify(plan, execResult);

      expect(result.status).toBe("failed");
      expect(result.steps[0].match).toBe(false);
    });
  });

  // =========================================================================
  // task.create verification
  // =========================================================================

  describe("task.create verification", () => {
    it("should verify when task exists with matching title", async () => {
      mockPrisma.task.findUnique.mockResolvedValue({
        id: "t-1",
        title: "Call client",
      });

      const action = makeAction("task.create", { title: "Call client" });
      const plan = makePlan([action]);
      const execResult = makeExecutionResult([
        makeResult("action-1", "success", "t-1"),
      ]);

      const result = await verify(plan, execResult);

      expect(result.status).toBe("verified");
      expect(result.steps[0].match).toBe(true);
    });
  });

  // =========================================================================
  // task.complete verification
  // =========================================================================

  describe("task.complete verification", () => {
    it("should verify when task is marked completed", async () => {
      mockPrisma.task.findUnique.mockResolvedValue({
        id: "t-1",
        completed: true,
      });

      const action = makeAction("task.complete", { id: "t-1" });
      const plan = makePlan([action]);
      const execResult = makeExecutionResult([
        makeResult("action-1", "success"),
      ]);

      const result = await verify(plan, execResult);

      expect(result.status).toBe("verified");
      expect(result.steps[0].match).toBe(true);
    });

    it("should fail when task is not completed", async () => {
      mockPrisma.task.findUnique.mockResolvedValue({
        id: "t-1",
        completed: false,
      });

      const action = makeAction("task.complete", { id: "t-1" });
      const plan = makePlan([action]);
      const execResult = makeExecutionResult([
        makeResult("action-1", "success"),
      ]);

      const result = await verify(plan, execResult);

      expect(result.status).toBe("failed");
      expect(result.steps[0].match).toBe(false);
    });
  });

  // =========================================================================
  // deal.moveStage verification
  // =========================================================================

  describe("deal.moveStage verification", () => {
    it("should verify when deal is at expected stage", async () => {
      mockPrisma.deal.findUnique.mockResolvedValue({
        id: "d-1",
        stage: "qualified",
      });

      const action = makeAction("deal.moveStage", {
        id: "d-1",
        to_stage: "qualified",
      });
      const plan = makePlan([action]);
      const execResult = makeExecutionResult([
        makeResult("action-1", "success"),
      ]);

      const result = await verify(plan, execResult);

      expect(result.status).toBe("verified");
      expect(result.steps[0].match).toBe(true);
    });

    it("should fail when deal is at wrong stage", async () => {
      mockPrisma.deal.findUnique.mockResolvedValue({
        id: "d-1",
        stage: "new_lead",
      });

      const action = makeAction("deal.moveStage", {
        id: "d-1",
        to_stage: "qualified",
      });
      const plan = makePlan([action]);
      const execResult = makeExecutionResult([
        makeResult("action-1", "success"),
      ]);

      const result = await verify(plan, execResult);

      expect(result.status).toBe("failed");
      expect(result.steps[0].match).toBe(false);
    });
  });

  // =========================================================================
  // crm.search verification
  // =========================================================================

  describe("crm.search verification", () => {
    it("should verify when search succeeded", async () => {
      const action = makeAction("crm.search", { entity: "contact", query: "test" });
      const plan = makePlan([action]);
      const execResult = makeExecutionResult([
        makeResult("action-1", "success"),
      ]);

      const result = await verify(plan, execResult);

      expect(result.status).toBe("verified");
      expect(result.steps[0].match).toBe(true);
    });

    it("should fail when search errored", async () => {
      const action = makeAction("crm.search", { entity: "contact", query: "test" });
      const plan = makePlan([action]);
      const execResult = makeExecutionResult([
        makeResult("action-1", "error"),
      ]);

      const result = await verify(plan, execResult);

      expect(result.status).toBe("failed");
      expect(result.steps[0].match).toBe(false);
    });
  });

  // =========================================================================
  // note.append verification
  // =========================================================================

  describe("note.append verification", () => {
    it("should verify when note exists", async () => {
      mockPrisma.note.findUnique.mockResolvedValue({
        id: "n-1",
        body: "Some note",
      });

      const action = makeAction("note.append", { body: "Some note" });
      const plan = makePlan([action]);
      const execResult = makeExecutionResult([
        makeResult("action-1", "success", "n-1"),
      ]);

      const result = await verify(plan, execResult);

      expect(result.status).toBe("verified");
    });

    it("should fail when note not found", async () => {
      mockPrisma.note.findUnique.mockResolvedValue(null);

      const action = makeAction("note.append", { body: "Test" });
      const plan = makePlan([action]);
      const execResult = makeExecutionResult([
        makeResult("action-1", "success", "n-missing"),
      ]);

      const result = await verify(plan, execResult);

      expect(result.status).toBe("failed");
    });
  });

  // =========================================================================
  // Approval required actions
  // =========================================================================

  describe("approval_required actions", () => {
    it("should skip verification for approval_required results", async () => {
      const action = makeAction("email.send", {
        contactId: "c1",
        subject: "Hi",
        body: "Hello",
      });
      const plan = makePlan([action]);
      const execResult = makeExecutionResult([
        makeResult("action-1", "approval_required"),
      ]);

      const result = await verify(plan, execResult);

      expect(result.steps[0].status).toBe("skipped");
      expect(result.skipped_count).toBe(1);
    });
  });

  // =========================================================================
  // Multi-action verification
  // =========================================================================

  describe("Multi-action verification", () => {
    it("should return 'verified' when all actions pass", async () => {
      mockPrisma.contact.findUnique.mockResolvedValue({
        id: "c-1",
        name: "Alice",
      });
      mockPrisma.deal.findUnique.mockResolvedValue({
        id: "d-1",
        title: "Deal A",
      });

      const plan = makePlan([
        makeAction("lead.create", { name: "Alice" }, "a-1"),
        makeAction("deal.create", { title: "Deal A" }, "a-2"),
      ]);
      const execResult = makeExecutionResult([
        makeResult("a-1", "success", "c-1"),
        makeResult("a-2", "success", "d-1"),
      ]);

      const result = await verify(plan, execResult);

      expect(result.status).toBe("verified");
      expect(result.verified_count).toBe(2);
      expect(result.failed_count).toBe(0);
    });

    it("should return 'partial' when some actions pass and some fail", async () => {
      mockPrisma.contact.findUnique.mockResolvedValue({
        id: "c-1",
        name: "Alice",
      });
      mockPrisma.deal.findUnique.mockResolvedValue(null); // deal not found

      const plan = makePlan([
        makeAction("lead.create", { name: "Alice" }, "a-1"),
        makeAction("deal.create", { title: "Deal A" }, "a-2"),
      ]);
      const execResult = makeExecutionResult([
        makeResult("a-1", "success", "c-1"),
        makeResult("a-2", "success", "d-1"),
      ]);

      const result = await verify(plan, execResult);

      expect(result.status).toBe("partial");
      expect(result.verified_count).toBe(1);
      expect(result.failed_count).toBe(1);
    });

    it("should skip actions with no execution result", async () => {
      const plan = makePlan([
        makeAction("lead.create", { name: "Alice" }, "a-1"),
      ]);
      // Empty results - no execution happened
      const execResult = makeExecutionResult([]);

      const result = await verify(plan, execResult);

      expect(result.steps[0].status).toBe("skipped");
      expect(result.skipped_count).toBe(1);
    });
  });

  // =========================================================================
  // Default/unknown action types
  // =========================================================================

  describe("Default action types", () => {
    it("should use result status for unknown action types", async () => {
      const action = makeAction("referral.create", { title: "Ref" });
      const plan = makePlan([action]);
      const execResult = makeExecutionResult([
        makeResult("action-1", "success"),
      ]);

      const result = await verify(plan, execResult);

      expect(result.status).toBe("verified");
      expect(result.steps[0].status).toBe("verified");
    });
  });
});
