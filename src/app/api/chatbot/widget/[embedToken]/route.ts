import { NextRequest, NextResponse } from "next/server";
import { getChatBotByEmbedToken } from "@/lib/db/honeycomb";

/**
 * GET /api/chatbot/widget/[embedToken]
 * Public endpoint — returns bot config for the embeddable widget.
 * No auth required. The embedToken serves as the public identifier.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ embedToken: string }> }
) {
  try {
    const { embedToken } = await params;

    if (!embedToken) {
      return NextResponse.json({ error: "Missing embed token" }, { status: 400 });
    }

    const bot = await getChatBotByEmbedToken(embedToken);

    if (!bot) {
      return NextResponse.json({ error: "Chat bot not found" }, { status: 404 });
    }

    if (bot.status !== "active") {
      return NextResponse.json({ error: "Chat bot is not active" }, { status: 403 });
    }

    // Return only public-safe configuration (no system prompt)
    const config = {
      botId: bot.id,
      name: bot.name,
      welcomeMessage: bot.welcomeMessage,
      qualificationFlow: bot.qualificationFlow ?? [],
      brandColor: bot.brandColor ?? "#f59e0b",
      position: bot.position ?? "bottom-right",
      avatarUrl: bot.avatarUrl,
      companyName: bot.companyName,
      autoGreet: bot.autoGreet,
      autoGreetDelay: bot.autoGreetDelay,
      collectLeadAfter: bot.collectLeadAfter,
    };

    return NextResponse.json(config, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (error) {
    console.error("[chatbot/widget] Error:", error);
    return NextResponse.json(
      { error: "Failed to load chat bot" },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS — CORS preflight for cross-origin widget embedding
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
