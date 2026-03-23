// ============================================================================
// COLONY LAM - Large Action Model
// Main entry point and orchestration
// ============================================================================

export * from "./actionSchema";
export * from "./llm";
// export * from "./llmParser"; // Disabled - using manual parsing in planner
export * from "./planner";
export * from "./runtime";
export * from "./verifier";
export * from "./audit";
export * from "./undo";
export * from "./rateLimit";

import * as Sentry from "@sentry/nextjs";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { planFromMessage, type PlannerInput } from "./planner";
import { executePlan, type ExecutionContext } from "./runtime";
import { verify } from "./verifier";
import { recordRun, updateRun, getRun } from "./audit";
import { getDefaultProvider, type LLMMessage } from "./llm";
import type { ActionPlan } from "./actionSchema";
import type { ExecutionResult } from "./runtime";
import type { VerificationResult } from "./verifier";

// ============================================================================
// Orchestrated LAM Run
// ============================================================================

export interface LamRunInput {
  message: string;
  user_id: string;
  recent_context?: Array<{
    entity_type: "contact" | "deal" | "task" | "property";
    entity_id: string;
    entity_name?: string;
    last_touched: Date;
  }>;
  permissions?: string[];
  dry_run?: boolean;
}

export interface LamRunResult {
  run_id: string;
  plan: ActionPlan;
  execution_result: ExecutionResult | null;
  verification_result: VerificationResult | null;
  response: {
    message: string;
    follow_up_question: string | null;
    requires_approval: boolean;
    can_undo: boolean;
  };
}

/**
 * Execute a complete LAM run: plan -> execute -> summarize -> audit
 */
export async function runLam(input: LamRunInput): Promise<LamRunResult> {
  return Sentry.withScope(async (scope) => {
    // Tag every LAM error with user and context
    scope.setUser({ id: input.user_id });
    scope.setTag("lam.dry_run", input.dry_run ? "true" : "false");
    scope.setContext("lam_input", {
      message_length: input.message.length,
      has_context: !!input.recent_context?.length,
      context_count: input.recent_context?.length ?? 0,
    });

    return _runLamInner(input);
  });
}

async function _runLamInner(input: LamRunInput): Promise<LamRunResult> {
  // Step 1: Plan
  const plannerInput: PlannerInput = {
    user_message: input.message,
    user_id: input.user_id,
    recent_context: input.recent_context,
    permissions: input.permissions,
  };

  // ── PRE-CHECK: Self-introduction / business info ──
  // When the user tells us about themselves ("I'm a real estate agent in X"),
  // save to profile and respond conversationally — no planner needed.
  const selfIntroMatch = input.message.match(
    /(?:i(?:'m| am) (?:a |an )?)(.+?)(?:\s+(?:in|based in|located in|from|near)\s+)(.+?)(?:\.|$)/i
  );
  if (selfIntroMatch && !input.message.toLowerCase().includes("add ") && !input.message.toLowerCase().includes("create ")) {
    const businessType = selfIntroMatch[1]?.trim();
    const location = selfIntroMatch[2]?.trim();

    // Save to profile
    try {
      const updateData: Record<string, unknown> = {};
      if (businessType) updateData.businessType = businessType;
      if (location) {
        updateData.serviceAreaCity = location;
        if (!await prisma.profile.findUnique({ where: { id: input.user_id }, select: { serviceAreaRadius: true } }).then(p => p?.serviceAreaRadius)) {
          updateData.serviceAreaRadius = 25; // default radius
        }
      }
      await prisma.profile.update({
        where: { id: input.user_id },
        data: updateData,
      });
    } catch (e) {
      console.error("Failed to save profile from self-intro:", e);
    }

    const runId = await recordRun({
      user_id: input.user_id,
      message: input.message,
      plan: {
        plan_id: randomUUID(),
        intent: "User shared business information",
        confidence: 0.95,
        plan_steps: [],
        actions: [],
        verification_steps: [],
        user_summary: `Saved business info: ${businessType || ""}${location ? ` in ${location}` : ""}`,
        follow_up_question: null,
        requires_approval: false,
        highest_risk_tier: 0,
      },
    });

    const friendlyBiz = businessType || "your business";
    const friendlyLoc = location ? ` in ${location}` : "";
    return {
      run_id: runId,
      plan: {
        plan_id: randomUUID(),
        intent: "User shared business information",
        confidence: 0.95,
        plan_steps: [],
        actions: [],
        verification_steps: [],
        user_summary: `Saved: ${friendlyBiz}${friendlyLoc}`,
        follow_up_question: null,
        requires_approval: false,
        highest_risk_tier: 0,
      },
      execution_result: null,
      verification_result: null,
      response: {
        message: `Got it — ${friendlyBiz}${friendlyLoc}! I've saved that to your profile. How can I help you today? I can run ads to generate leads, manage your contacts and deals, track tasks, and more.`,
        follow_up_question: null,
        requires_approval: false,
        can_undo: false,
      },
    };
  }

  const planResult = await Sentry.startSpan(
    { name: "lam.plan", op: "ai.plan" },
    () => planFromMessage(plannerInput)
  );

  if (!planResult.success) {
    Sentry.setContext("lam_plan_error", {
      code: planResult.code,
      error: planResult.error,
    });
    throw new Error(planResult.error);
  }

  const plan = planResult.plan;

  Sentry.addBreadcrumb({
    category: "lam",
    message: `Plan: ${plan.intent} (${plan.actions.length} actions, tier ${plan.highest_risk_tier})`,
    level: "info",
    data: {
      action_types: plan.actions.map((a) => a.type),
      requires_approval: plan.requires_approval,
      confidence: plan.confidence,
    },
  });

  // ── SAFETY NET: Catch misrouted lead.update targeting "user_profile" ──
  // If the planner still generates a lead.update with name containing "profile"
  // or "user", strip it — it's a self-intro that slipped through.
  plan.actions = plan.actions.filter(a => {
    if (a.type === "lead.update") {
      const payload = a.payload as Record<string, unknown>;
      const name = String(payload.name || payload.contactName || "").toLowerCase();
      if (name.includes("user_profile") || name.includes("user profile") || name === "profile") {
        return false; // Remove this misrouted action
      }
    }
    return true;
  });

  // If all actions were stripped and there's no follow-up, add a conversational response
  if (plan.actions.length === 0 && !plan.follow_up_question) {
    plan.follow_up_question = plan.user_summary || "How can I help you today?";
  }

  // ── HARD OVERRIDE: Prevent lead.create from hijacking ad requests ──
  // If the user's original message mentions generating leads, running ads,
  // or getting business, and the planner routed to lead.create, that's WRONG.
  // Strip the lead.create action entirely.
  const originalMessage = input.message.toLowerCase();
  const isAdRequest =
    originalMessage.includes("generate") ||
    originalMessage.includes("i need leads") ||
    originalMessage.includes("i need seller") ||
    originalMessage.includes("i need buyer") ||
    originalMessage.includes("run ads") ||
    originalMessage.includes("run some ads") ||
    originalMessage.includes("advertise") ||
    originalMessage.includes("get me leads") ||
    originalMessage.includes("lead generation") ||
    originalMessage.includes("get me more") ||
    originalMessage.includes("need new clients") ||
    originalMessage.includes("need more business");
  if (isAdRequest) {
    // Remove any lead.create actions — these are misrouted ad requests
    plan.actions = plan.actions.filter(a => a.type !== "lead.create");

    // If we stripped all actions and there's no ads action left, check Meta account
    const hasAdsAction = plan.actions.some(a => a.type.startsWith("ads."));

    if (!hasAdsAction && plan.actions.length === 0) {
      // Check for Meta account
      const metaAccount = await prisma.metaAdAccount.findFirst({
        where: { userId: input.user_id, status: "active" },
      });
      if (!metaAccount) {
        plan.follow_up_question = "To run ads and generate leads, I need access to your Facebook Ads account first. Head to Settings and tap Connect Facebook under Integrations — it takes about 30 seconds. Once connected, come back and I'll build your campaign.";
        plan.user_summary = plan.follow_up_question;
      } else if (!plan.follow_up_question) {
        // Has Meta account but planner didn't create an ads action.
        // Check if the user already provided budget/area in conversation —
        // if so, create the campaign action directly instead of re-asking.
        const msgLower = originalMessage;
        const hasBudget = /\$\d+|\d+\s*(?:dollars|bucks|per day|\/day|a day)/i.test(msgLower);
        const hasArea = /\b(?:in |near |around |target )?\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*(?:\s[A-Z]{2})?\b/i.test(input.message);

        // Also load the user's saved service area
        const profile = await prisma.profile.findUnique({
          where: { id: input.user_id },
          select: { serviceAreaCity: true, serviceAreaRadius: true },
        });
        const hasServiceArea = !!profile?.serviceAreaCity;

        if (hasBudget || hasArea || hasServiceArea) {
          // We have enough context — create the ads.create_campaign action
          // and let the runtime handle targeting from the profile
          const budgetMatch = msgLower.match(/\$(\d+)/);
          const budget = budgetMatch ? parseInt(budgetMatch[1], 10) : 10;

          const { getRiskTier, requiresApproval } = await import("./actionSchema");
          const actionType = "ads.create_campaign" as const;
          plan.actions = [{
            action_id: randomUUID(),
            idempotency_key: `${input.user_id}:ads.create_campaign:${Date.now()}`,
            type: actionType,
            risk_tier: getRiskTier(actionType),
            requires_approval: requiresApproval(actionType),
            payload: {
              channel: "native" as const,
              objective: "LEADS" as const,
              daily_budget: budget,
            },
            expected_outcome: { entity_type: "campaign", created: true },
          } as ActionPlan["actions"][0]];
          plan.follow_up_question = null;
          plan.requires_approval = true;
          plan.highest_risk_tier = 2;
        } else {
          // Genuinely missing info — but be specific about what we need
          const questions: string[] = [];
          questions.push("What's your daily budget? ($10, $15, $25, or custom?)");
          if (!hasServiceArea) {
            questions.push("What area should I target? (I'll save this as your service area for next time.)");
          }
          plan.follow_up_question = `I can set up a Facebook/Instagram lead campaign for you. ${questions.join("\n")}`;
          plan.user_summary = plan.follow_up_question;
        }
      }
    }
  }
  // ── Honeycomb guardrail: check Meta account for any ads actions ──
  if (plan.actions.some(a => a.type.startsWith("ads."))) {
    const metaAccount = await prisma.metaAdAccount.findFirst({
      where: { userId: input.user_id, status: "active" },
    });
    if (!metaAccount) {
      plan.actions = plan.actions.filter(a => !a.type.startsWith("ads."));
      plan.follow_up_question = "To run ads, I need access to your Facebook Ads account. Head to Settings and tap Connect Facebook under Integrations. Once connected, come back and I'll build your campaign.";
      plan.user_summary = plan.follow_up_question;
    }
  }

  // Step 2: Record the run
  const runId = await recordRun({
    user_id: input.user_id,
    message: input.message,
    plan,
  });

  // If there's a follow-up question, don't execute — respond with the question.
  if (plan.follow_up_question) {
    // Use the follow_up_question as the sole message. It already contains
    // the context + questions. Adding user_summary would create redundancy.
    const message = plan.follow_up_question;

    return {
      run_id: runId,
      plan,
      execution_result: null,
      verification_result: null,
      response: {
        message,
        follow_up_question: null,
        requires_approval: false,
        can_undo: false,
      },
    };
  }

  // Step 3: Execute
  const ctx: ExecutionContext = {
    user_id: input.user_id,
    run_id: runId,
    dry_run: input.dry_run,
  };

  const executionResult = await Sentry.startSpan(
    { name: "lam.execute", op: "ai.execute", attributes: { "lam.run_id": runId } },
    () => executePlan(plan, ctx)
  );

  Sentry.addBreadcrumb({
    category: "lam",
    message: `Executed: ${executionResult.actions_executed} ok, ${executionResult.actions_failed} failed`,
    level: executionResult.actions_failed > 0 ? "warning" : "info",
    data: {
      status: executionResult.status,
      actions_executed: executionResult.actions_executed,
      actions_failed: executionResult.actions_failed,
      actions_pending: executionResult.actions_pending_approval,
    },
  });

  // Alert Sentry on execution failures (non-approval)
  if (executionResult.actions_failed > 0) {
    Sentry.captureMessage(
      `LAM execution: ${executionResult.actions_failed} action(s) failed`,
      {
        level: "warning",
        contexts: {
          lam_execution: {
            run_id: runId,
            user_id: input.user_id,
            intent: plan.intent,
            failed_actions: executionResult.results
              .filter((r) => r.status === "failed")
              .map((r) => ({ type: r.action_type, error: r.error })),
          },
        },
      }
    );
  }

  // Step 4: Verify
  const verificationResult = await Sentry.startSpan(
    { name: "lam.verify", op: "ai.verify" },
    () => verify(plan, executionResult)
  );

  // Step 5: Generate conversational summary using LLM with actual data
  const conversationalMessage = await summarizeResults(
    input.message,
    plan,
    executionResult,
  );

  // Step 6: Update audit record
  await updateRun({
    run_id: runId,
    execution_result: executionResult,
    verification_result: verificationResult,
    status:
      executionResult.status === "approval_required"
        ? "approval_required"
        : executionResult.status === "completed"
        ? "completed"
        : "failed",
    user_summary: conversationalMessage,
  });

  return {
    run_id: runId,
    plan,
    execution_result: executionResult,
    verification_result: verificationResult,
    response: {
      message: conversationalMessage,
      follow_up_question: null,
      requires_approval: executionResult.status === "approval_required",
      can_undo: executionResult.actions_executed > 0,
    },
  };
}

// ============================================================================
// LLM-powered response summarization
// ============================================================================

const SUMMARIZE_SYSTEM_PROMPT = `You are Tara, the AI assistant inside Colony. You just executed actions on behalf of the user. Summarize the results in warm, conversational plain English. You're direct and competent — not overly enthusiastic, not robotic. Talk like a trusted coworker who just handled something for them.

Rules:
- Talk like a helpful colleague, not a robot. No jargon.
- ALWAYS include the actual data the user asked for. If they said "show me my contacts", list the contacts. If they said "show my pipeline", give the numbers.
- For lists of 5 or fewer items, show all of them with key details.
- For lists of 6+ items, highlight the top 5 and mention the total count. Offer to filter.
- For mutations (create/update), confirm what changed with specifics.
- If an action failed, explain what went wrong simply.
- If results are empty, say so naturally and suggest a next step.
- Keep it concise — 2-4 sentences for simple results, more for data-heavy queries.
- Do NOT use markdown headers or bullet points. Write flowing sentences.
- Do NOT start with "Sure!" or "Here you go!" — just answer naturally.
- Use dollar amounts, dates, and names when available.
- For image generation results: include the image URL as a markdown image like ![Generated Image](url) so the UI can display it inline.
- For content generation results: include the full generated content in your response.`;

function buildResultsContext(executionResult: ExecutionResult): string {
  const parts: string[] = [];

  for (const result of executionResult.results) {
    if (result.status === "success") {
      parts.push(
        `Action "${result.action_type}" succeeded. Data: ${JSON.stringify(result.data, null, 0)}`
      );
    } else if (result.status === "failed") {
      parts.push(
        `Action "${result.action_type}" failed: ${result.error || "unknown error"}`
      );
    } else if (result.status === "approval_required") {
      parts.push(
        `Action "${result.action_type}" requires your approval before it can run.`
      );
    }
  }

  return parts.join("\n\n");
}

async function summarizeResults(
  userMessage: string,
  plan: ActionPlan,
  executionResult: ExecutionResult,
): Promise<string> {
  const resultsContext = buildResultsContext(executionResult);

  // If all actions failed with no data, skip the LLM call
  if (executionResult.actions_executed === 0 && executionResult.actions_failed > 0) {
    const errors = executionResult.results
      .filter((r) => r.status === "failed")
      .map((r) => r.error)
      .filter(Boolean);
    if (errors.length === 1) {
      // Single error — return it directly (it's already user-friendly)
      return errors[0]!;
    }
    return errors.join("\n\n") || "Something went wrong. Want to try again?";
  }

  // If only approval-required actions, no data to summarize
  if (executionResult.actions_executed === 0 && executionResult.actions_pending_approval > 0) {
    return plan.user_summary;
  }

  try {
    const llm = getDefaultProvider();

    const messages: LLMMessage[] = [
      { role: "system", content: SUMMARIZE_SYSTEM_PROMPT },
      {
        role: "user",
        content: `The user said: "${userMessage}"

Plan intent: ${plan.intent}

Execution results:
${resultsContext}

Summarize these results conversationally for the user. Include the actual data.`,
      },
    ];

    const response = await llm.complete(messages, {
      temperature: 0.6,
      maxTokens: 1024,
    });

    return response.content.trim();
  } catch (error) {
    console.error("Summarization LLM call failed, falling back:", error);
    return buildFallbackSummary(plan, executionResult);
  }
}

function buildFallbackSummary(
  plan: ActionPlan,
  execution: ExecutionResult,
): string {
  const parts: string[] = [plan.user_summary];

  if (execution.actions_executed > 0) {
    parts.push(`✓ ${execution.actions_executed} action(s) completed`);
  }
  if (execution.actions_failed > 0) {
    parts.push(`✗ ${execution.actions_failed} action(s) failed`);
  }
  if (execution.actions_pending_approval > 0) {
    parts.push(`⏳ ${execution.actions_pending_approval} action(s) awaiting approval`);
  }

  return parts.join("\n\n");
}

/**
 * Continue a run after providing additional info (for follow-up questions)
 */
export async function continueLamRun(
  runId: string,
  additionalMessage: string,
  userId: string
): Promise<LamRunResult> {
  const existingRun = await getRun(runId);
  if (!existingRun) {
    throw new Error("Run not found");
  }

  if (existingRun.user_id !== userId) {
    throw new Error("Permission denied");
  }

  // Create a new run with combined context
  const combinedMessage = `${existingRun.message}\n\nUser response: ${additionalMessage}`;

  return runLam({
    message: combinedMessage,
    user_id: userId,
  });
}

