import { NextRequest } from "next/server";
import { validateRequest } from "twilio/lib/webhooks/webhooks";
import { prisma } from "@/lib/prisma";
import { sendSMS } from "@/lib/twilio";
import { runLam } from "@/lam";
import { checkRateLimit, recordUsage, LAM_LIMITS } from "@/lam/rateLimit";
import { findOrCreateThread, createInboundMessage } from "@/lib/db/inbox";

const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
const CONVERSATION_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

const TWIML_EMPTY = new Response("<Response/>", {
  headers: { "Content-Type": "text/xml" },
});

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));

  const signature = request.headers.get("x-twilio-signature") ?? "";
  const url = request.url;

  if (!validateRequest(TWILIO_AUTH_TOKEN, signature, url, params)) {
    return new Response("Forbidden", { status: 403 });
  }

  const from = params.From;
  const body = params.Body?.trim() ?? "";
  const messageSid = params.MessageSid;

  if (!from || !messageSid) {
    return TWIML_EMPTY;
  }

  try {
    const userPhone = await prisma.userPhone.findUnique({
      where: { phoneNumber: from },
      include: { profile: true },
    });

    if (!userPhone) {
      await sendSMS(
        from,
        "Hey! Looks like you don't have a Colony account linked to this number yet. Sign up at jerseyproper.com/colony"
      );
      return TWIML_EMPTY;
    }

    const profileId = userPhone.profileId;

    const rateCheck = await checkRateLimit(profileId);
    if (!rateCheck.allowed) {
      await sendSMS(from, "You've hit your usage limit. Try again later.");
      return TWIML_EMPTY;
    }

    const windowCutoff = new Date(Date.now() - CONVERSATION_WINDOW_MS);

    let conversation = await prisma.conversation.findFirst({
      where: {
        profileId,
        channel: "sms",
        lastActiveAt: { gte: windowCutoff },
      },
      orderBy: { lastActiveAt: "desc" },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { profileId, channel: "sms" },
      });
    }

    await prisma.$transaction([
      prisma.sMSMessage.create({
        data: {
          profileId,
          direction: "inbound",
          from,
          to: process.env.TWILIO_PHONE_NUMBER!,
          body,
          twilioSid: messageSid,
          status: "delivered",
        },
      }),
      prisma.conversationMessage.create({
        data: {
          convId: conversation.id,
          role: "user",
          content: body,
          channel: "sms",
        },
      }),
      prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastActiveAt: new Date() },
      }),
    ]);

    // Create/update InboxThread for the SMS conversation
    try {
      const { threadId } = await findOrCreateThread({
        channel: "sms",
        address: from,
        direction: "inbound",
        userId: profileId,
      });

      await createInboundMessage({
        threadId,
        channel: "sms",
        fromAddress: from,
        toAddress: process.env.TWILIO_PHONE_NUMBER!,
        bodyText: body,
        providerMessageId: messageSid,
      });
    } catch (inboxErr) {
      console.error("Failed to create inbox thread for SMS:", inboxErr);
    }

    const history = await prisma.conversationMessage.findMany({
      where: { convId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    const contextPrefix = history.length > 1
      ? "Previous conversation:\n" +
        history
          .slice(0, -1)
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n") +
        "\n\nNew message: "
      : "";

    let replyText: string;
    let lamRunId: string | null = null;

    try {
      const result = await runLam({
        message: contextPrefix + body,
        user_id: profileId,
      });

      lamRunId = result.run_id;
      replyText = result.response.message;

      if (result.response.follow_up_question) {
        replyText += "\n\n" + result.response.follow_up_question;
      }

      if (result.response.requires_approval) {
        replyText +=
          "\n\n(This action needs your approval. Open Colony to confirm.)";
      }

      recordUsage(profileId, LAM_LIMITS.ESTIMATED_COST_PER_REQUEST);
    } catch (error) {
      console.error("LAM SMS error:", error);
      replyText = "Something went wrong. Try again in a sec.";
    }

    // SMS has a 1600-char limit; truncate gracefully
    if (replyText.length > 1500) {
      replyText = replyText.slice(0, 1497) + "...";
    }

    const outbound = await sendSMS(from, replyText);

    await prisma.$transaction([
      prisma.conversationMessage.create({
        data: {
          convId: conversation.id,
          role: "assistant",
          content: replyText,
          channel: "sms",
          lamRunId,
        },
      }),
      prisma.sMSMessage.create({
        data: {
          profileId,
          direction: "outbound",
          from: process.env.TWILIO_PHONE_NUMBER!,
          to: from,
          body: replyText,
          twilioSid: outbound.sid,
          status: "sent",
          lamRunId,
        },
      }),
    ]);

    return TWIML_EMPTY;
  } catch (error) {
    console.error("SMS inbound error:", error);

    try {
      await sendSMS(from, "Something went wrong. Try again in a sec.");
    } catch {
      // Swallow — we already failed, don't mask the original error
    }

    return TWIML_EMPTY;
  }
}
