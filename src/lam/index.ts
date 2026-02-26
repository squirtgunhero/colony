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
  // Step 1: Plan
  const plannerInput: PlannerInput = {
    user_message: input.message,
    user_id: input.user_id,
    recent_context: input.recent_context,
    permissions: input.permissions,
  };

  const planResult = await planFromMessage(plannerInput);

  if (!planResult.success) {
    throw new Error(planResult.error);
  }

  const plan = planResult.plan;

  // Step 2: Record the run
  const runId = await recordRun({
    user_id: input.user_id,
    message: input.message,
    plan,
  });

  // If there's a follow-up question, don't execute
  if (plan.follow_up_question) {
    return {
      run_id: runId,
      plan,
      execution_result: null,
      verification_result: null,
      response: {
        message: plan.user_summary,
        follow_up_question: plan.follow_up_question,
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

  const executionResult = await executePlan(plan, ctx);

  // Step 4: Verify
  const verificationResult = await verify(plan, executionResult);

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
- Use dollar amounts, dates, and names when available.`;

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
    return `I ran into a problem: ${errors.join("; ") || "something went wrong"}. Want to try again?`;
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

