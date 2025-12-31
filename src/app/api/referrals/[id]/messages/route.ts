import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { getReferralMessages, createReferralMessage } from "@/lib/db/referrals";
import type { MessageType, MessageVisibility } from "@/lib/db/referrals";

/**
 * GET /api/referrals/:id/messages
 * Get messages for a referral
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
    const messages = await getReferralMessages(id);

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Failed to get referral messages:", error);
    const message = error instanceof Error ? error.message : "Failed to get messages";
    return NextResponse.json(
      { error: message },
      { status: message.includes("not found") ? 404 : 500 }
    );
  }
}

/**
 * POST /api/referrals/:id/messages
 * Create a message in a referral conversation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    if (!body.bodyText || typeof body.bodyText !== "string") {
      return NextResponse.json(
        { error: "Message body is required" },
        { status: 400 }
      );
    }

    const result = await createReferralMessage({
      referralId: id,
      messageType: body.messageType as MessageType,
      bodyText: body.bodyText,
      bodyHtml: body.bodyHtml,
      visibility: body.visibility as MessageVisibility,
      metadata: body.metadata,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to create referral message:", error);
    const message = error instanceof Error ? error.message : "Failed to create message";
    const status = message.includes("not found") ? 404 
      : message.includes("Cannot message") || message.includes("Only participants") ? 400 
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

