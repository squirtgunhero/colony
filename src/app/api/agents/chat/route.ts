// ============================================================================
// POST /api/agents/chat
// Managed Agent SSE streaming endpoint for web chat.
// Replaces /api/lam/run when agentMode is enabled.
// ============================================================================

import * as Sentry from "@sentry/nextjs";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, recordUsage, LAM_LIMITS } from "@/lam/rateLimit";
import {
  getOrCreateSession,
  sendMessageAndStream,
} from "@/lib/agents/session-manager";
import type { LAMContext } from "@/lib/lam/actions/types";

const CONVERSATION_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Rate limit
    const rateCheck = await checkRateLimit(user.id);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: rateCheck.reason,
          retry_after: rateCheck.retryAfter,
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    const { message } = await req.json();
    if (!message?.trim()) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        fullName: true,
        serviceAreaCity: true,
        serviceAreaRadius: true,
        businessType: true,
      },
    });

    if (!profile) {
      return new Response("Profile not found", { status: 404 });
    }

    // Find or create conversation for persistence
    const windowCutoff = new Date(Date.now() - CONVERSATION_WINDOW_MS);
    let conversation = await prisma.conversation.findFirst({
      where: {
        profileId: user.id,
        channel: "web",
        lastActiveAt: { gte: windowCutoff },
      },
      orderBy: { lastActiveAt: "desc" },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { profileId: user.id, channel: "web" },
      });
    }

    // Save user message
    await prisma.$transaction([
      prisma.conversationMessage.create({
        data: {
          convId: conversation.id,
          role: "user",
          content: message.trim(),
          channel: "web",
        },
      }),
      prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastActiveAt: new Date() },
      }),
    ]);

    // Load conversation history for context
    const history = await prisma.conversationMessage.findMany({
      where: { convId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    const conversationHistory =
      history.length > 1
        ? history
            .slice(0, -1) // Exclude the message we just saved
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n")
        : undefined;

    // Get or create managed agent session
    const sessionId = await getOrCreateSession(profile.id, {
      userName: profile.fullName || "User",
      profileId: profile.id,
      timezone: "America/New_York", // TODO: Add timezone field to Profile model
      activePlaybooks: [],
      serviceAreaCity: profile.serviceAreaCity || undefined,
      businessType: profile.businessType || undefined,
      conversationHistory,
    });

    const lamContext: LAMContext = {
      profileId: profile.id,
      runId: undefined, // Managed Agent sessions don't use LAM run IDs
    };

    // Create SSE stream
    const encoder = new TextEncoder();
    let fullResponseText = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          await sendMessageAndStream(sessionId, message.trim(), lamContext, {
            onText(text) {
              fullResponseText += text;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "text", text })}\n\n`
                )
              );
            },

            onToolUse(toolName, toolInput) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "tool_use",
                    tool: toolName,
                    input: toolInput,
                  })}\n\n`
                )
              );
            },

            onConfirmationRequired(toolUseId, toolName, toolInput) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "confirmation_required",
                    toolUseId,
                    tool: toolName,
                    input: toolInput,
                    sessionId,
                  })}\n\n`
                )
              );
            },

            onAgentActivity(threadId, status) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "agent_activity",
                    threadId,
                    status,
                  })}\n\n`
                )
              );
            },

            async onComplete() {
              // Record usage
              await recordUsage(user!.id, LAM_LIMITS.ESTIMATED_COST_PER_REQUEST);

              // Save assistant response to conversation
              if (fullResponseText) {
                await prisma.conversationMessage.create({
                  data: {
                    convId: conversation!.id,
                    role: "assistant",
                    content: fullResponseText,
                    channel: "web",
                  },
                });
              }

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "done" })}\n\n`
                )
              );
              controller.close();
            },

            onError(error) {
              console.error("[AGENT] Chat stream error:", error);
              Sentry.captureException(error, {
                tags: { component: "agent", route: "/api/agents/chat" },
              });

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "error",
                    message: error.message,
                  })}\n\n`
                )
              );
              controller.close();
            },
          });
        } catch (error) {
          const err =
            error instanceof Error ? error : new Error(String(error));
          console.error("[AGENT] Chat route error:", err);
          Sentry.captureException(err, {
            tags: { component: "agent", route: "/api/agents/chat" },
          });

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message: err.message,
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[AGENT] Chat route error:", error);
    Sentry.captureException(error, {
      tags: { component: "agent", route: "/api/agents/chat" },
    });
    const message =
      error instanceof Error ? error.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
