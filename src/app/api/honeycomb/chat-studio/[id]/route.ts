import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { getChatBot, updateChatBot, deleteChatBot } from "@/lib/db/honeycomb";
import type { UpdateChatBotInput } from "@/lib/honeycomb/types";

/**
 * GET /api/honeycomb/chat-studio/[id]
 * Returns a single chat bot with full configuration
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const bot = await getChatBot(id);

    if (!bot) {
      return NextResponse.json({ error: "Chat bot not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: bot.id,
      name: bot.name,
      description: bot.description ?? undefined,
      status: bot.status,
      conversationCount: bot.conversationCount,
      welcomeMessage: bot.welcomeMessage ?? undefined,
      embedToken: bot.embedToken,
      qualificationFlow: bot.qualificationFlow ?? [],
      brandColor: bot.brandColor ?? "#f59e0b",
      position: bot.position ?? "bottom-right",
      avatarUrl: bot.avatarUrl ?? undefined,
      companyName: bot.companyName ?? undefined,
      autoGreet: bot.autoGreet,
      autoGreetDelay: bot.autoGreetDelay,
      collectLeadAfter: bot.collectLeadAfter,
      notifyOnLead: bot.notifyOnLead,
      createdAt: bot.createdAt.toISOString(),
      updatedAt: bot.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Failed to get chat bot:", error);
    return NextResponse.json({ error: "Failed to get chat bot" }, { status: 500 });
  }
}

/**
 * PATCH /api/honeycomb/chat-studio/[id]
 * Updates a chat bot's configuration
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const input: UpdateChatBotInput = await request.json();
    const bot = await updateChatBot(id, input);

    if (!bot) {
      return NextResponse.json({ error: "Chat bot not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: bot.id,
      name: bot.name,
      description: bot.description ?? undefined,
      status: bot.status,
      conversationCount: bot.conversationCount,
      welcomeMessage: bot.welcomeMessage ?? undefined,
      embedToken: bot.embedToken,
      qualificationFlow: bot.qualificationFlow ?? [],
      brandColor: bot.brandColor ?? "#f59e0b",
      position: bot.position ?? "bottom-right",
      avatarUrl: bot.avatarUrl ?? undefined,
      companyName: bot.companyName ?? undefined,
      autoGreet: bot.autoGreet,
      autoGreetDelay: bot.autoGreetDelay,
      collectLeadAfter: bot.collectLeadAfter,
      notifyOnLead: bot.notifyOnLead,
      createdAt: bot.createdAt.toISOString(),
      updatedAt: bot.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Failed to update chat bot:", error);
    return NextResponse.json({ error: "Failed to update chat bot" }, { status: 500 });
  }
}

/**
 * DELETE /api/honeycomb/chat-studio/[id]
 * Deletes a chat bot and all its conversations
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const deleted = await deleteChatBot(id);

    if (!deleted) {
      return NextResponse.json({ error: "Chat bot not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete chat bot:", error);
    return NextResponse.json({ error: "Failed to delete chat bot" }, { status: 500 });
  }
}
