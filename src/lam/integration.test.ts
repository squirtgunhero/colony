import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks – available inside vi.mock factories
// ---------------------------------------------------------------------------

const { mockComplete, mockPrisma } = vi.hoisted(() => {
  const mockComplete = vi.fn();

  const mockPrisma = {
    contact: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
    deal: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
    task: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
    note: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    activity: { create: vi.fn() },
    lamRun: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    lamAction: {
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    lamIdempotencyKey: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    lamChangeLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    teamMember: { findFirst: vi.fn() },
    $transaction: vi.fn((fn: unknown) =>
      Array.isArray(fn) ? Promise.all(fn) : (fn as () => unknown)(),
    ),
  };

  return { mockComplete, mockPrisma };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

vi.mock("@/lam/llm", () => ({
  getDefaultProvider: vi.fn(() => ({
    name: "mock",
    complete: mockComplete,
    completeJSON: vi.fn(),
  })),
}));

vi.mock("@/lib/twilio", () => ({ sendSMS: vi.fn() }));
vi.mock("@/lib/gmail", () => ({ sendGmailEmail: vi.fn() }));
vi.mock("@/lib/meta/client", () => ({ createMetaClient: vi.fn() }));
vi.mock("@/lib/meta/sync", () => ({ syncMetaAdAccount: vi.fn() }));

// ---------------------------------------------------------------------------
// Imports (resolved after mocks are in place)
// ---------------------------------------------------------------------------

import { runLam } from "@/lam";
import { undoRun } from "@/lam/undo";

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

const USER_ID = "user-1";

const FAKE_CONTACT = {
  id: "contact-1",
  userId: USER_ID,
  name: "John Smith",
  email: "john@example.com",
  phone: "555-0100",
  source: "referral",
  type: "lead",
  tags: [] as string[],
  notes: null,
  isFavorite: false,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

const FAKE_DEAL = {
  id: "deal-1",
  userId: USER_ID,
  title: "Kitchen Remodel",
  value: 50000,
  stage: "new_lead",
  contactId: null,
  propertyId: null,
  expectedCloseDate: null,
  notes: null,
  isFavorite: false,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

const FAKE_TASK = {
  id: "task-1",
  userId: USER_ID,
  title: "Call Sarah tomorrow",
  description: null,
  dueDate: null,
  priority: "medium",
  completed: false,
  contactId: null,
  dealId: null,
  propertyId: null,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("LAM Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Audit / infra defaults
    mockPrisma.lamRun.create.mockResolvedValue({ id: "run-1" });
    mockPrisma.lamRun.update.mockResolvedValue({});
    mockPrisma.lamRun.findUnique.mockResolvedValue(null);
    mockPrisma.lamRun.findFirst.mockResolvedValue(null);
    mockPrisma.lamAction.create.mockResolvedValue({ id: "action-db-1" });
    mockPrisma.lamAction.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.lamIdempotencyKey.findUnique.mockResolvedValue(null);
    mockPrisma.lamIdempotencyKey.create.mockResolvedValue({});
    mockPrisma.lamChangeLog.create.mockResolvedValue({});
    mockPrisma.lamChangeLog.update.mockResolvedValue({});
    mockPrisma.activity.create.mockResolvedValue({});
    mockPrisma.teamMember.findFirst.mockResolvedValue(null);

    // Entity defaults
    mockPrisma.contact.create.mockResolvedValue(FAKE_CONTACT);
    mockPrisma.contact.findUnique.mockResolvedValue(FAKE_CONTACT);
    mockPrisma.contact.findMany.mockResolvedValue([FAKE_CONTACT]);
    mockPrisma.contact.findFirst.mockResolvedValue(null);
    mockPrisma.contact.delete.mockResolvedValue(FAKE_CONTACT);
    mockPrisma.contact.deleteMany.mockResolvedValue({ count: 0 });

    mockPrisma.deal.create.mockResolvedValue(FAKE_DEAL);
    mockPrisma.deal.findUnique.mockResolvedValue(FAKE_DEAL);
    mockPrisma.deal.findMany.mockResolvedValue([FAKE_DEAL]);

    mockPrisma.task.create.mockResolvedValue(FAKE_TASK);
    mockPrisma.task.findUnique.mockResolvedValue(FAKE_TASK);
    mockPrisma.task.findMany.mockResolvedValue([FAKE_TASK]);
  });

  // =========================================================================
  // 1. lead.create
  // =========================================================================

  it("lead.create – creates a contact and records full audit trail", async () => {
    const plannerJson = JSON.stringify({
      intent: "Create a new lead",
      confidence: 0.95,
      actions: [
        {
          type: "lead.create",
          idempotency_key: "test:lead.create:1",
          payload: {
            name: "John Smith",
            email: "john@example.com",
            phone: "555-0100",
            source: "referral",
          },
        },
      ],
      user_summary: "I'll create a new lead for John Smith.",
      follow_up_question: null,
    });

    mockComplete
      .mockResolvedValueOnce(llmResponse(plannerJson))
      .mockResolvedValueOnce(
        llmResponse("Done! I've added John Smith as a new lead."),
      );

    const result = await runLam({
      message: "Add John Smith as a new lead",
      user_id: USER_ID,
    });

    expect(mockPrisma.contact.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "John Smith",
          email: "john@example.com",
        }),
      }),
    );

    expect(mockPrisma.activity.create).toHaveBeenCalled();
    expect(mockPrisma.lamRun.create).toHaveBeenCalled();

    expect(mockPrisma.lamChangeLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          operation: "create",
          entityType: "Contact",
        }),
      }),
    );

    expect(mockPrisma.lamIdempotencyKey.findUnique).toHaveBeenCalled();

    expect(typeof result.response.message).toBe("string");
    expect(result.execution_result?.status).toBe("completed");
    expect(result.execution_result?.actions_executed).toBe(1);
  });

  // =========================================================================
  // 2. crm.search
  // =========================================================================

  it("crm.search – retrieves contacts without mutations", async () => {
    const plannerJson = JSON.stringify({
      intent: "List contacts",
      confidence: 0.95,
      actions: [
        {
          type: "crm.search",
          idempotency_key: "test:crm.search:1",
          payload: { entity: "contact", query: "" },
        },
      ],
      user_summary: "Here are your contacts.",
      follow_up_question: null,
    });

    mockComplete
      .mockResolvedValueOnce(llmResponse(plannerJson))
      .mockResolvedValueOnce(
        llmResponse("You have 1 contact: John Smith (john@example.com)."),
      );

    const result = await runLam({
      message: "Show me my contacts",
      user_id: USER_ID,
    });

    expect(mockPrisma.contact.findMany).toHaveBeenCalled();
    expect(result.execution_result?.status).toBe("completed");
    expect(result.execution_result?.actions_executed).toBe(1);
    expect(result.plan.highest_risk_tier).toBe(0);
    expect(result.plan.requires_approval).toBe(false);
  });

  // =========================================================================
  // 3. deal.create
  // =========================================================================

  it("deal.create – creates a deal with correct value and title", async () => {
    const plannerJson = JSON.stringify({
      intent: "Create a deal",
      confidence: 0.95,
      actions: [
        {
          type: "deal.create",
          idempotency_key: "test:deal.create:1",
          payload: { title: "Kitchen Remodel", value: 50000 },
        },
      ],
      user_summary: "I'll create a $50k deal for Kitchen Remodel.",
      follow_up_question: null,
    });

    mockComplete
      .mockResolvedValueOnce(llmResponse(plannerJson))
      .mockResolvedValueOnce(
        llmResponse("Created a $50,000 deal for Kitchen Remodel in your pipeline."),
      );

    const result = await runLam({
      message: "Open a $50k deal for kitchen remodel",
      user_id: USER_ID,
    });

    expect(mockPrisma.deal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Kitchen Remodel",
          value: 50000,
        }),
      }),
    );

    expect(mockPrisma.lamChangeLog.create).toHaveBeenCalled();
    expect(mockPrisma.activity.create).toHaveBeenCalled();
    expect(result.execution_result?.status).toBe("completed");
  });

  // =========================================================================
  // 4. task.create
  // =========================================================================

  it("task.create – creates a task with a title", async () => {
    const plannerJson = JSON.stringify({
      intent: "Create a reminder task",
      confidence: 0.95,
      actions: [
        {
          type: "task.create",
          idempotency_key: "test:task.create:1",
          payload: { title: "Call Sarah tomorrow" },
        },
      ],
      user_summary: "I'll remind you to call Sarah.",
      follow_up_question: null,
    });

    mockComplete
      .mockResolvedValueOnce(llmResponse(plannerJson))
      .mockResolvedValueOnce(
        llmResponse("Reminder set: call Sarah tomorrow."),
      );

    const result = await runLam({
      message: "Remind me to call Sarah tomorrow",
      user_id: USER_ID,
    });

    expect(mockPrisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Call Sarah tomorrow",
        }),
      }),
    );

    expect(result.execution_result?.status).toBe("completed");
    expect(result.execution_result?.actions_executed).toBe(1);
  });

  // =========================================================================
  // 5. email.send (Tier 2 – approval required)
  // =========================================================================

  it("email.send – requires approval and does not send", async () => {
    const plannerJson = JSON.stringify({
      intent: "Send an email",
      confidence: 0.9,
      actions: [
        {
          type: "email.send",
          idempotency_key: "test:email.send:1",
          payload: {
            contactId: "contact-1",
            subject: "Hello",
            body: "Hi there",
          },
        },
      ],
      user_summary:
        "I'll send an email to John. This needs your approval first.",
      follow_up_question: null,
    });

    // Only the planner LLM call fires; summarizer returns plan.user_summary
    mockComplete.mockResolvedValueOnce(llmResponse(plannerJson));

    const result = await runLam({
      message: "Send an email to john@example.com",
      user_id: USER_ID,
    });

    expect(result.execution_result?.status).toBe("approval_required");
    expect(result.execution_result?.actions_pending_approval).toBe(1);
    expect(result.execution_result?.actions_executed).toBe(0);
    expect(result.response.requires_approval).toBe(true);
    // LLM was called only once (planner), not twice (no summarizer)
    expect(mockComplete).toHaveBeenCalledTimes(1);
  });

  // =========================================================================
  // 6. lead.deleteAll (Tier 2 – approval required)
  // =========================================================================

  it("lead.deleteAll – requires approval and does not delete", async () => {
    const plannerJson = JSON.stringify({
      intent: "Delete all contacts",
      confidence: 0.9,
      actions: [
        {
          type: "lead.deleteAll",
          idempotency_key: "test:lead.deleteAll:1",
          payload: { confirm: true },
        },
      ],
      user_summary: "I'll delete all your contacts. This needs your approval.",
      follow_up_question: null,
    });

    mockComplete.mockResolvedValueOnce(llmResponse(plannerJson));

    const result = await runLam({
      message: "Delete all my contacts",
      user_id: USER_ID,
    });

    expect(mockPrisma.contact.deleteMany).not.toHaveBeenCalled();
    expect(result.execution_result?.status).toBe("approval_required");
  });

  // =========================================================================
  // 7. Idempotency – duplicate request returns cached result
  // =========================================================================

  it("idempotency – second request returns cached result without re-executing", async () => {
    const plannerJson = JSON.stringify({
      intent: "Create a new lead",
      confidence: 0.95,
      actions: [
        {
          type: "lead.create",
          idempotency_key: "test:lead.create:idem",
          payload: { name: "John Smith", email: "john@example.com" },
        },
      ],
      user_summary: "I'll create a new lead for John Smith.",
      follow_up_question: null,
    });

    // First call: key does not exist → execute. Second call: key exists → cache hit.
    mockPrisma.lamIdempotencyKey.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        key: "user-1:test:lead.create:idem",
        runId: "run-1",
        resultJson: FAKE_CONTACT,
      });

    // 4 LLM calls total: (planner + summarizer) × 2 runLam calls
    mockComplete
      .mockResolvedValueOnce(llmResponse(plannerJson))
      .mockResolvedValueOnce(llmResponse("Created John Smith."))
      .mockResolvedValueOnce(llmResponse(plannerJson))
      .mockResolvedValueOnce(
        llmResponse("John Smith is already in your contacts."),
      );

    const result1 = await runLam({
      message: "Add John Smith",
      user_id: USER_ID,
    });
    expect(result1.execution_result?.actions_executed).toBe(1);
    expect(mockPrisma.contact.create).toHaveBeenCalledTimes(1);

    const result2 = await runLam({
      message: "Add John Smith",
      user_id: USER_ID,
    });
    expect(result2.execution_result?.actions_executed).toBe(1);
    // contact.create was NOT called again – cached path was taken
    expect(mockPrisma.contact.create).toHaveBeenCalledTimes(1);
  });

  // =========================================================================
  // 8. Follow-up question – ambiguous request
  // =========================================================================

  it("follow-up question – returns question without executing", async () => {
    const plannerJson = JSON.stringify({
      intent: "Find a contact named John",
      confidence: 0.5,
      actions: [],
      user_summary: "I need a bit more information.",
      follow_up_question:
        "Which John? I found John Smith and John Doe.",
    });

    // Only the planner is called; no execution or summarization
    mockComplete.mockResolvedValueOnce(llmResponse(plannerJson));

    const result = await runLam({
      message: "Update John's email",
      user_id: USER_ID,
    });

    expect(result.execution_result).toBeNull();
    expect(result.response.follow_up_question).toBe(
      "Which John? I found John Smith and John Doe.",
    );

    expect(mockPrisma.contact.create).not.toHaveBeenCalled();
    expect(mockPrisma.deal.create).not.toHaveBeenCalled();
    expect(mockPrisma.task.create).not.toHaveBeenCalled();
    expect(mockComplete).toHaveBeenCalledTimes(1);
  });

  // =========================================================================
  // 9. Multi-action plan
  // =========================================================================

  it("multi-action – executes both lead.create and deal.create", async () => {
    const janeContact = {
      ...FAKE_CONTACT,
      id: "contact-jane",
      name: "Jane Doe",
      email: "jane@example.com",
    };
    const renoDeal = {
      ...FAKE_DEAL,
      id: "deal-reno",
      title: "Renovation Project",
      value: 25000,
    };

    mockPrisma.contact.create.mockResolvedValue(janeContact);
    mockPrisma.contact.findUnique.mockResolvedValue(janeContact);
    mockPrisma.deal.create.mockResolvedValue(renoDeal);
    mockPrisma.deal.findUnique.mockResolvedValue(renoDeal);

    const plannerJson = JSON.stringify({
      intent: "Create a lead and a deal",
      confidence: 0.9,
      actions: [
        {
          type: "lead.create",
          idempotency_key: "test:multi:lead",
          payload: { name: "Jane Doe", email: "jane@example.com" },
        },
        {
          type: "deal.create",
          idempotency_key: "test:multi:deal",
          payload: { title: "Renovation Project", value: 25000 },
        },
      ],
      user_summary:
        "I'll add Jane Doe and open a deal for the Renovation Project.",
      follow_up_question: null,
    });

    mockComplete
      .mockResolvedValueOnce(llmResponse(plannerJson))
      .mockResolvedValueOnce(
        llmResponse(
          "Added Jane Doe and created a $25,000 Renovation Project deal.",
        ),
      );

    const result = await runLam({
      message: "Add a lead and create a deal",
      user_id: USER_ID,
    });

    expect(mockPrisma.contact.create).toHaveBeenCalled();
    expect(mockPrisma.deal.create).toHaveBeenCalled();
    expect(result.execution_result?.actions_executed).toBe(2);
    expect(mockPrisma.lamChangeLog.create).toHaveBeenCalledTimes(2);
  });

  // =========================================================================
  // 10. Undo flow
  // =========================================================================

  it("undo – reverts a lead.create by deleting the contact", async () => {
    const runId = "run-undo-1";
    const changeLogId = "changelog-1";

    mockPrisma.lamRun.findUnique.mockResolvedValue({
      id: runId,
      userId: USER_ID,
      status: "completed",
      changeLogs: [
        {
          id: changeLogId,
          runId,
          actionId: "action-1",
          entityType: "Contact",
          entityId: "contact-1",
          operation: "create",
          beforeJson: null,
          afterJson: FAKE_CONTACT,
          undone: false,
          createdAt: new Date(),
        },
      ],
      actions: [{ id: "action-db-1", riskTier: 1, status: "executed" }],
    });

    const undoResult = await undoRun(runId, USER_ID);

    expect(mockPrisma.contact.delete).toHaveBeenCalledWith({
      where: { id: "contact-1" },
    });

    expect(mockPrisma.lamChangeLog.update).toHaveBeenCalledWith({
      where: { id: changeLogId },
      data: { undone: true },
    });

    expect(undoResult.success).toBe(true);
    expect(undoResult.changes_reverted).toBe(1);
  });
});
