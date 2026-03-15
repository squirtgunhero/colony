// ============================================================================
// POST /api/lam/run
// Execute a LAM action from natural language
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { runLam } from "@/lam";
import { checkRateLimit, recordUsage, LAM_LIMITS } from "@/lam/rateLimit";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const CONVERSATION_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check rate limits BEFORE making API call
    const rateCheck = await checkRateLimit(user.id);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { 
          error: rateCheck.reason,
          retry_after: rateCheck.retryAfter,
          usage: rateCheck.usage,
        },
        { status: 429 }
      );
    }

    // Parse request body (simple validation, no Zod)
    const body = await request.json();
    
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const recent_context = Array.isArray(body.recent_context) ? body.recent_context : undefined;
    const dry_run = body.dry_run === true;

    // Find or create active web conversation (same window logic as SMS)
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

    // Save inbound user message
    await prisma.$transaction([
      prisma.conversationMessage.create({
        data: {
          convId: conversation.id,
          role: "user",
          content: message,
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

    // Load user profile for service area context
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { serviceAreaCity: true, serviceAreaRadius: true, businessType: true },
    });

    let contextPrefix = "";

    // Add profile context so the planner knows about saved service area
    if (profile?.serviceAreaCity || profile?.businessType) {
      contextPrefix += "User profile:\n";
      if (profile.businessType) contextPrefix += `Business type: ${profile.businessType}\n`;
      if (profile.serviceAreaCity) contextPrefix += `Service area: ${profile.serviceAreaCity}, ${profile.serviceAreaRadius || 25} mi radius\n`;
      contextPrefix += "\n";
    }

    if (history.length > 1) {
      const priorMessages = history.slice(0, -1);
      contextPrefix += "Previous conversation:\n" +
        priorMessages
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n") +
        "\n\nNew message: ";
    }

    const messageWithContext = contextPrefix + message;

    // Execute LAM run
    const result = await runLam({
      message: messageWithContext,
      user_id: user.id,
      recent_context: recent_context?.map((ctx: { entity_type: string; entity_id: string; entity_name?: string; last_touched?: string }) => ({
        ...ctx,
        entity_type: ctx.entity_type as "contact" | "deal" | "task" | "property",
        last_touched: ctx.last_touched
          ? new Date(ctx.last_touched)
          : new Date(),
      })),
      dry_run,
    });

    // Record usage AFTER successful API call
    recordUsage(user.id, LAM_LIMITS.ESTIMATED_COST_PER_REQUEST);

    // Save assistant response
    const assistantContent = result.response.message +
      (result.response.follow_up_question ? "\n\n" + result.response.follow_up_question : "");

    await prisma.conversationMessage.create({
      data: {
        convId: conversation.id,
        role: "assistant",
        content: assistantContent,
        channel: "web",
        lamRunId: result.run_id,
      },
    });

    // Distill any UI-relevant sentinel signals from raw action results so
    // client components can react without re-parsing every result object.
    const actionSignals: { open_import_panel?: boolean } = {};
    const actionCards: Array<{ type: string; data: Record<string, unknown> }> = [];
    if (result.execution_result) {
      for (const r of result.execution_result.results) {
        const d = r.data as Record<string, unknown> | null | undefined;
        if (d?.__open_import_panel) actionSignals.open_import_panel = true;
        if (d?.__action_card) {
          actionCards.push(d.__action_card as { type: string; data: Record<string, unknown> });
        }
      }
    }

    return NextResponse.json({
      success: true,
      run_id: result.run_id,
      plan: {
        intent: result.plan.intent,
        confidence: result.plan.confidence,
        actions: result.plan.actions.map((a) => ({
          type: a.type,
          action_id: a.action_id,
          risk_tier: a.risk_tier,
          requires_approval: a.requires_approval,
        })),
        user_summary: result.plan.user_summary,
        follow_up_question: result.plan.follow_up_question,
        action_cards: actionCards.length > 0 ? actionCards : undefined,
      },
      execution_result: result.execution_result
        ? {
            status: result.execution_result.status,
            actions_executed: result.execution_result.actions_executed,
            actions_failed: result.execution_result.actions_failed,
            actions_pending_approval:
              result.execution_result.actions_pending_approval,
            user_summary: result.execution_result.user_summary,
            action_signals: Object.keys(actionSignals).length > 0 ? actionSignals : undefined,
          }
        : null,
      verification_result: result.verification_result
        ? {
            status: result.verification_result.status,
            verified_count: result.verification_result.verified_count,
            failed_count: result.verification_result.failed_count,
          }
        : null,
      response: result.response,
    });
  } catch (error) {
    console.error("LAM run error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

