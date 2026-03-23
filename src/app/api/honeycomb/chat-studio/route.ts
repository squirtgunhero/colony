import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { getChatBots, createChatBot } from "@/lib/db/honeycomb";
import type { CreateChatBotInput } from "@/lib/honeycomb/types";

/**
 * GET /api/honeycomb/chat-studio
 * Returns list of chat bots with full configuration
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chatBots = await getChatBots();

    const response = {
      chatBots: chatBots.map((bot) => ({
        id: bot.id,
        name: bot.name,
        description: bot.description ?? undefined,
        status: bot.status as "draft" | "active" | "paused",
        conversationCount: bot.conversationCount,
        welcomeMessage: bot.welcomeMessage ?? undefined,
        embedToken: bot.embedToken,
        qualificationFlow: (bot.qualificationFlow ?? []) as unknown[],
        brandColor: (bot.brandColor ?? "#f59e0b") as string,
        position: (bot.position ?? "bottom-right") as "bottom-right" | "bottom-left",
        avatarUrl: bot.avatarUrl ?? undefined,
        companyName: bot.companyName ?? undefined,
        autoGreet: bot.autoGreet,
        autoGreetDelay: bot.autoGreetDelay,
        collectLeadAfter: bot.collectLeadAfter,
        notifyOnLead: bot.notifyOnLead,
        createdAt: bot.createdAt.toISOString(),
        updatedAt: bot.updatedAt.toISOString(),
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to get honeycomb chat bots:", error);
    return NextResponse.json(
      { error: "Failed to get chat bots" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/honeycomb/chat-studio
 * Creates a new chat bot
 */
export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const input: CreateChatBotInput = await request.json();
    const chatBot = await createChatBot(input);

    return NextResponse.json({
      id: chatBot.id,
      name: chatBot.name,
      description: chatBot.description ?? undefined,
      status: chatBot.status,
      conversationCount: chatBot.conversationCount,
      welcomeMessage: chatBot.welcomeMessage ?? undefined,
      embedToken: chatBot.embedToken,
      qualificationFlow: (chatBot.qualificationFlow as unknown[]) ?? [],
      brandColor: chatBot.brandColor ?? "#f59e0b",
      position: chatBot.position ?? "bottom-right",
      avatarUrl: chatBot.avatarUrl ?? undefined,
      companyName: chatBot.companyName ?? undefined,
      autoGreet: chatBot.autoGreet,
      autoGreetDelay: chatBot.autoGreetDelay,
      collectLeadAfter: chatBot.collectLeadAfter,
      notifyOnLead: chatBot.notifyOnLead,
      createdAt: chatBot.createdAt.toISOString(),
      updatedAt: chatBot.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create honeycomb chat bot:", error);
    return NextResponse.json(
      { error: "Failed to create chat bot" },
      { status: 500 }
    );
  }
}
