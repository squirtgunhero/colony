import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { getChatBots, createChatBot } from "@/lib/db/honeycomb";
import type { ChatBotsResponse, CreateChatBotInput } from "@/lib/honeycomb/types";

/**
 * GET /api/honeycomb/chat-studio
 * Returns list of chat bots
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chatBots = await getChatBots();
    
    const response: ChatBotsResponse = {
      chatBots: chatBots.map((bot) => ({
        id: bot.id,
        name: bot.name,
        description: bot.description ?? undefined,
        status: bot.status,
        conversationCount: bot.conversationCount,
        welcomeMessage: bot.welcomeMessage ?? undefined,
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
