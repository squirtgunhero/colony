// ============================================================================
// Managed Agent Session Manager
// Manages the lifecycle of Anthropic Managed Agent sessions.
// One session per user conversation, with 30-minute reuse window.
//
// Phase 1: Single Tara agent with all tools.
// Phase 3+: Orchestrator with sub-agent threads.
// ============================================================================

import Anthropic from "@anthropic-ai/sdk";
import { buildTaraSystemPrompt, type TaraPromptContext } from "./prompts/tara";
import { handleCustomToolCall, isCustomTool, TOOL_TO_ACTION } from "./tool-handler";
import { CRM_CUSTOM_TOOLS } from "./tools";
import type { LAMContext } from "@/lib/lam/actions/types";

const client = new Anthropic();

// ============================================================================
// Types
// ============================================================================

interface SessionState {
  sessionId: string;
  profileId: string;
  createdAt: Date;
}

/** Events emitted during message streaming */
export interface AgentStreamCallbacks {
  onText: (text: string) => void;
  onToolUse: (toolName: string, toolInput: Record<string, unknown>) => void;
  onConfirmationRequired?: (
    toolUseId: string,
    toolName: string,
    toolInput: Record<string, unknown>
  ) => void;
  onAgentActivity?: (threadId: string, status: "started" | "completed") => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

// ============================================================================
// Session Cache
// In-memory for now — Phase 4 moves to Supabase/Redis for persistence.
// ============================================================================

const activeSessions = new Map<string, SessionState>();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

// ============================================================================
// Session Management
// ============================================================================

/**
 * Get or create a Managed Agent session for this user.
 * Reuses sessions within a 30-minute window.
 */
export async function getOrCreateSession(
  profileId: string,
  promptContext: TaraPromptContext
): Promise<string> {
  // Check for existing active session
  const existing = activeSessions.get(profileId);
  if (existing) {
    const age = Date.now() - existing.createdAt.getTime();
    if (age < SESSION_TTL_MS) {
      return existing.sessionId;
    }
    // Expired — remove and create new
    activeSessions.delete(profileId);
  }

  // Create a new Managed Agent session
  const session = await client.beta.sessions.create({
    agent_id: process.env.COLONY_AGENT_ID!,
    environment_id: process.env.COLONY_ENVIRONMENT_ID!,
  });

  activeSessions.set(profileId, {
    sessionId: session.id,
    profileId,
    createdAt: new Date(),
  });

  return session.id;
}

/**
 * Invalidate a user's session (e.g., on logout or manual reset).
 */
export function invalidateSession(profileId: string): void {
  activeSessions.delete(profileId);
}

// ============================================================================
// Message Handling
// ============================================================================

/**
 * Send a user message to the Managed Agent session and stream the response.
 * Handles:
 * - Text streaming to the UI
 * - Custom tool execution via the tool handler
 * - Tool confirmation requests (Phase 2)
 * - Sub-agent thread events (Phase 3)
 */
export async function sendMessageAndStream(
  sessionId: string,
  message: string,
  lamContext: LAMContext,
  callbacks: AgentStreamCallbacks
): Promise<void> {
  try {
    // Send the user message as a session event
    await client.beta.sessions.events.create(sessionId, {
      events: [
        {
          type: "user_message" as const,
          content: [{ type: "text" as const, text: message }],
        },
      ],
    });

    // Open the SSE stream and process events
    const stream = await client.beta.sessions.stream(sessionId);

    for await (const event of stream) {
      await processStreamEvent(event, sessionId, lamContext, callbacks);
    }

    // Stream ended naturally
    callbacks.onComplete();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[AGENT] Stream error:", err);
    callbacks.onError(err);
  }
}

/**
 * Send a tool confirmation response (approve/deny) for a paused tool call.
 */
export async function sendToolConfirmation(
  sessionId: string,
  toolUseId: string,
  approved: boolean,
  threadId?: string
): Promise<void> {
  await client.beta.sessions.events.create(sessionId, {
    events: [
      {
        type: "tool_confirmation" as const,
        tool_use_id: toolUseId,
        result: approved ? ("allow" as const) : ("deny" as const),
        ...(threadId && { session_thread_id: threadId }),
      },
    ],
  });
}

// ============================================================================
// Stream Event Processing
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processStreamEvent(
  event: any,
  sessionId: string,
  lamContext: LAMContext,
  callbacks: AgentStreamCallbacks
): Promise<void> {
  switch (event.type) {
    // Agent is sending text back to the user
    case "agent_message":
    case "agent.message": {
      if (event.content) {
        for (const block of event.content) {
          if (block.type === "text" && block.text) {
            callbacks.onText(block.text);
          }
        }
      }
      break;
    }

    // Agent is calling a tool
    case "agent_tool_use":
    case "agent.tool_use": {
      const toolName = event.name;
      const toolInput = event.input as Record<string, unknown>;

      // Only handle our custom CRM tools — built-in tools are handled by the agent
      if (isCustomTool(toolName)) {
        callbacks.onToolUse(toolName, toolInput);

        // Execute the tool via our action registry
        const result = await handleCustomToolCall(toolName, toolInput, lamContext);

        // Return the result to the managed session
        await client.beta.sessions.events.create(sessionId, {
          events: [
            {
              type: "custom_tool_result" as const,
              tool_use_id: event.id,
              content: [
                { type: "text" as const, text: JSON.stringify(result) },
              ],
              // Preserve thread ID for sub-agent tool calls (Phase 3+)
              ...(event.session_thread_id && {
                session_thread_id: event.session_thread_id,
              }),
            },
          ],
        });
      }
      break;
    }

    // Agent requires tool confirmation (Phase 2)
    case "agent_tool_confirmation_request":
    case "agent.tool_confirmation_request": {
      if (callbacks.onConfirmationRequired) {
        callbacks.onConfirmationRequired(
          event.tool_use_id,
          event.name,
          event.input as Record<string, unknown>
        );
      }
      break;
    }

    // Sub-agent thread events (Phase 3)
    case "session.thread_created": {
      if (callbacks.onAgentActivity) {
        callbacks.onAgentActivity(event.session_thread_id, "started");
      }
      break;
    }

    case "session.thread_idle": {
      if (callbacks.onAgentActivity) {
        callbacks.onAgentActivity(event.session_thread_id, "completed");
      }
      break;
    }

    // Session is idle — agent finished processing
    case "session_idle":
    case "session.status_idle": {
      // The stream will end naturally; onComplete is called after the loop
      break;
    }

    default: {
      // Unknown event types — log for debugging during development
      if (process.env.NODE_ENV === "development") {
        console.log(`[AGENT] Unhandled event type: ${event.type}`);
      }
      break;
    }
  }
}
