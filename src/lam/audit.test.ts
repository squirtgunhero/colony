// ============================================================================
// LAM Audit Tests
// Tests audit trail persistence with mocked Prisma
// ============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    lamRun: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    lamAction: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    lamChangeLog: {
      findMany: vi.fn(),
    },
  };
  return { mockPrisma };
});

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import {
  recordRun,
  updateRun,
  getRun,
  getRecentRuns,
  getPendingApprovalRuns,
  getEntityAuditLog,
} from "./audit";
import type { ActionPlan } from "./actionSchema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_ID = "user-audit-test";

function makePlan(overrides: Partial<ActionPlan> = {}): ActionPlan {
  return {
    plan_id: "plan-1",
    intent: "Test intent",
    confidence: 0.9,
    plan_steps: [],
    actions: [
      {
        action_id: "action-1",
        idempotency_key: "test:lead.create:1",
        type: "lead.create",
        risk_tier: 1,
        requires_approval: false,
        payload: { name: "Test" },
        expected_outcome: { entity_type: "contact" },
      } as ActionPlan["actions"][0],
    ],
    verification_steps: [],
    user_summary: "Test summary",
    follow_up_question: null,
    requires_approval: false,
    highest_risk_tier: 1,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // recordRun
  // =========================================================================

  describe("recordRun", () => {
    it("should create a LAM run with correct data", async () => {
      mockPrisma.lamRun.create.mockResolvedValue({ id: "run-1" });
      mockPrisma.lamAction.create.mockResolvedValue({ id: "action-db-1" });

      const plan = makePlan();
      const runId = await recordRun({
        user_id: USER_ID,
        message: "Add a lead",
        plan,
      });

      expect(runId).toBe("run-1");
      expect(mockPrisma.lamRun.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: USER_ID,
          message: "Add a lead",
          status: "executing",
          userSummary: "Test summary",
        }),
      });
    });

    it("should record individual actions", async () => {
      mockPrisma.lamRun.create.mockResolvedValue({ id: "run-1" });
      mockPrisma.lamAction.create.mockResolvedValue({ id: "action-db-1" });

      const plan = makePlan();
      await recordRun({ user_id: USER_ID, message: "Test", plan });

      expect(mockPrisma.lamAction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          runId: "run-1",
          actionId: "action-1",
          actionType: "lead.create",
          riskTier: 1,
        }),
      });
    });

    it("should set status to 'pending' when plan has follow-up question", async () => {
      mockPrisma.lamRun.create.mockResolvedValue({ id: "run-2" });

      const plan = makePlan({
        follow_up_question: "Which contact?",
        actions: [],
      });
      await recordRun({ user_id: USER_ID, message: "Update John", plan });

      expect(mockPrisma.lamRun.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: "pending",
        }),
      });
    });

    it("should record multiple actions in a multi-action plan", async () => {
      mockPrisma.lamRun.create.mockResolvedValue({ id: "run-3" });
      mockPrisma.lamAction.create.mockResolvedValue({ id: "action-db" });

      const plan = makePlan({
        actions: [
          {
            action_id: "a-1",
            idempotency_key: "test:1",
            type: "lead.create",
            risk_tier: 1,
            requires_approval: false,
            payload: { name: "Alice" },
            expected_outcome: {},
          } as ActionPlan["actions"][0],
          {
            action_id: "a-2",
            idempotency_key: "test:2",
            type: "deal.create",
            risk_tier: 1,
            requires_approval: false,
            payload: { title: "Deal" },
            expected_outcome: {},
          } as ActionPlan["actions"][0],
        ],
      });

      await recordRun({ user_id: USER_ID, message: "Add lead and deal", plan });

      expect(mockPrisma.lamAction.create).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // updateRun
  // =========================================================================

  describe("updateRun", () => {
    it("should update run with execution result", async () => {
      mockPrisma.lamRun.update.mockResolvedValue({});
      mockPrisma.lamAction.updateMany.mockResolvedValue({ count: 1 });

      const execResult = {
        run_id: "run-1",
        status: "completed" as const,
        actions_executed: 1,
        actions_skipped: 0,
        actions_failed: 0,
        actions_pending_approval: 0,
        user_summary: "Created contact.",
        results: [
          {
            action_id: "action-1",
            action_type: "lead.create",
            status: "success" as const,
          },
        ],
      };

      await updateRun({
        run_id: "run-1",
        execution_result: execResult,
        status: "completed",
      });

      expect(mockPrisma.lamRun.update).toHaveBeenCalledWith({
        where: { id: "run-1" },
        data: expect.objectContaining({
          status: "completed",
          completedAt: expect.any(Date),
        }),
      });
    });

    it("should update individual action statuses", async () => {
      mockPrisma.lamRun.update.mockResolvedValue({});
      mockPrisma.lamAction.updateMany.mockResolvedValue({ count: 1 });

      await updateRun({
        run_id: "run-1",
        execution_result: {
          run_id: "run-1",
          status: "completed" as const,
          actions_executed: 1,
          actions_skipped: 0,
          actions_failed: 0,
          actions_pending_approval: 0,
          user_summary: "Done",
          results: [
            {
              action_id: "action-1",
              action_type: "lead.create",
              status: "success" as const,
            },
          ],
        },
      });

      expect(mockPrisma.lamAction.updateMany).toHaveBeenCalledWith({
        where: { runId: "run-1", actionId: "action-1" },
        data: expect.objectContaining({
          status: "executed",
          executedAt: expect.any(Date),
        }),
      });
    });

    it("should set action status to 'failed' for failed results", async () => {
      mockPrisma.lamRun.update.mockResolvedValue({});
      mockPrisma.lamAction.updateMany.mockResolvedValue({ count: 1 });

      await updateRun({
        run_id: "run-1",
        execution_result: {
          run_id: "run-1",
          status: "completed" as const,
          actions_executed: 0,
          actions_skipped: 0,
          actions_failed: 1,
          actions_pending_approval: 0,
          user_summary: "Failed",
          results: [
            {
              action_id: "action-1",
              action_type: "lead.create",
              status: "failed" as const,
              error: "Something went wrong",
            },
          ],
        },
      });

      expect(mockPrisma.lamAction.updateMany).toHaveBeenCalledWith({
        where: { runId: "run-1", actionId: "action-1" },
        data: expect.objectContaining({
          status: "failed",
          executedAt: null,
        }),
      });
    });

    it("should set completedAt for failed status too", async () => {
      mockPrisma.lamRun.update.mockResolvedValue({});

      await updateRun({
        run_id: "run-1",
        status: "failed",
      });

      expect(mockPrisma.lamRun.update).toHaveBeenCalledWith({
        where: { id: "run-1" },
        data: expect.objectContaining({
          status: "failed",
          completedAt: expect.any(Date),
        }),
      });
    });

    it("should not set completedAt for executing status", async () => {
      mockPrisma.lamRun.update.mockResolvedValue({});

      await updateRun({
        run_id: "run-1",
        status: "executing",
      });

      const updateCall = mockPrisma.lamRun.update.mock.calls[0][0];
      expect(updateCall.data.completedAt).toBeUndefined();
    });

    it("should update user summary", async () => {
      mockPrisma.lamRun.update.mockResolvedValue({});

      await updateRun({
        run_id: "run-1",
        user_summary: "Created John Smith as a lead.",
      });

      expect(mockPrisma.lamRun.update).toHaveBeenCalledWith({
        where: { id: "run-1" },
        data: expect.objectContaining({
          userSummary: "Created John Smith as a lead.",
        }),
      });
    });
  });

  // =========================================================================
  // getRun
  // =========================================================================

  describe("getRun", () => {
    it("should return null when run not found", async () => {
      mockPrisma.lamRun.findUnique.mockResolvedValue(null);

      const result = await getRun("nonexistent");
      expect(result).toBeNull();
    });

    it("should return formatted audit record", async () => {
      const now = new Date();
      mockPrisma.lamRun.findUnique.mockResolvedValue({
        id: "run-1",
        userId: USER_ID,
        message: "Add John",
        planJson: { intent: "Create lead" },
        resultJson: null,
        verifyJson: null,
        userSummary: "Created John.",
        status: "completed",
        createdAt: now,
        completedAt: now,
        actions: [],
      });

      const result = await getRun("run-1");

      expect(result).not.toBeNull();
      expect(result!.run_id).toBe("run-1");
      expect(result!.user_id).toBe(USER_ID);
      expect(result!.message).toBe("Add John");
      expect(result!.status).toBe("completed");
    });
  });

  // =========================================================================
  // getRecentRuns
  // =========================================================================

  describe("getRecentRuns", () => {
    it("should return recent runs for user", async () => {
      mockPrisma.lamRun.findMany.mockResolvedValue([
        {
          id: "run-1",
          userId: USER_ID,
          message: "Test 1",
          planJson: {},
          resultJson: null,
          verifyJson: null,
          userSummary: "Summary 1",
          status: "completed",
          createdAt: new Date(),
          completedAt: new Date(),
        },
        {
          id: "run-2",
          userId: USER_ID,
          message: "Test 2",
          planJson: {},
          resultJson: null,
          verifyJson: null,
          userSummary: "Summary 2",
          status: "completed",
          createdAt: new Date(),
          completedAt: new Date(),
        },
      ]);

      const runs = await getRecentRuns(USER_ID);

      expect(runs).toHaveLength(2);
      expect(mockPrisma.lamRun.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
    });

    it("should respect custom limit", async () => {
      mockPrisma.lamRun.findMany.mockResolvedValue([]);

      await getRecentRuns(USER_ID, 5);

      expect(mockPrisma.lamRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      );
    });
  });

  // =========================================================================
  // getPendingApprovalRuns
  // =========================================================================

  describe("getPendingApprovalRuns", () => {
    it("should filter by approval_required status", async () => {
      mockPrisma.lamRun.findMany.mockResolvedValue([]);

      await getPendingApprovalRuns(USER_ID);

      expect(mockPrisma.lamRun.findMany).toHaveBeenCalledWith({
        where: {
          userId: USER_ID,
          status: "approval_required",
        },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  // =========================================================================
  // getEntityAuditLog
  // =========================================================================

  describe("getEntityAuditLog", () => {
    it("should return change logs for entity", async () => {
      mockPrisma.lamChangeLog.findMany.mockResolvedValue([
        {
          runId: "run-1",
          actionId: "action-1",
          operation: "create",
          beforeJson: null,
          afterJson: { name: "John" },
          createdAt: new Date(),
          undone: false,
        },
        {
          runId: "run-2",
          actionId: "action-2",
          operation: "update",
          beforeJson: { name: "John" },
          afterJson: { name: "John Smith" },
          createdAt: new Date(),
          undone: false,
        },
      ]);

      const log = await getEntityAuditLog("Contact", "c-1");

      expect(log.changes).toHaveLength(2);
      expect(log.changes[0].operation).toBe("create");
      expect(log.changes[1].operation).toBe("update");
      expect(mockPrisma.lamChangeLog.findMany).toHaveBeenCalledWith({
        where: { entityType: "Contact", entityId: "c-1" },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should return empty array when no changes", async () => {
      mockPrisma.lamChangeLog.findMany.mockResolvedValue([]);

      const log = await getEntityAuditLog("Deal", "d-nonexistent");
      expect(log.changes).toHaveLength(0);
    });
  });
});
