import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { getBotConversations } from "@/lib/db/honeycomb";

/**
 * GET /api/honeycomb/chat-studio/[id]/conversations
 * Returns paginated conversations for a specific chat bot.
 * Query params: limit, cursor, status (active/closed/archived)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;

    const result = await getBotConversations(id, {
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined,
      cursor: searchParams.get("cursor") || undefined,
      status: searchParams.get("status") || undefined,
    });

    if (!result) {
      return NextResponse.json({ error: "Chat bot not found" }, { status: 404 });
    }

    return NextResponse.json({
      conversations: result.data.map((conv) => ({
        id: conv.id,
        visitorId: conv.visitorId,
        visitorName: conv.visitorName,
        visitorEmail: conv.visitorEmail,
        visitorPhone: conv.visitorPhone,
        qualificationData: conv.qualificationData,
        qualificationComplete: conv.qualificationComplete,
        contactId: conv.contactId,
        status: conv.status,
        pageUrl: conv.pageUrl,
        messageCount: conv._count.messages,
        lastMessages: conv.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
        })),
        createdAt: conv.createdAt.toISOString(),
        lastMessageAt: conv.lastMessageAt?.toISOString(),
      })),
      hasMore: result.hasMore,
      cursor: result.cursor,
    });
  } catch (error) {
    console.error("Failed to get conversations:", error);
    return NextResponse.json(
      { error: "Failed to get conversations" },
      { status: 500 }
    );
  }
}
