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
        "Hey, this is Tara from Colony. I don't have your number on file yet — sign up at mycolonyhq.com and verify your phone, then text me back."
      );
      return TWIML_EMPTY;
    }

    const profileId = userPhone.profileId;

    const rateCheck = await checkRateLimit(profileId);
    if (!rateCheck.allowed) {
      await sendSMS(from, "Hey, you've hit your limit for now. I'll be back online soon — try again in a bit.");
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

    // Load recent web conversation context for cross-channel continuity
    const recentWebMessages = await prisma.conversationMessage.findMany({
      where: {
        conv: { profileId, channel: "web" },
        createdAt: { gte: windowCutoff },
      },
      orderBy: { createdAt: "asc" },
      take: 5,
    });

    let contextPrefix = "";
    if (recentWebMessages.length > 0) {
      const webContext = recentWebMessages
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");

      if (history.length > 1) {
        contextPrefix = "Previous SMS conversation:\n" +
          history.slice(0, -1).map((m) => `${m.role}: ${m.content}`).join("\n") +
          "\n\nRecent web chat context:\n" + webContext +
          "\n\nNew SMS message: ";
      } else {
        contextPrefix = "Recent web chat context:\n" + webContext +
          "\n\nNew SMS message: ";
      }
    } else {
      contextPrefix = history.length > 1
        ? "Previous conversation:\n" +
          history.slice(0, -1).map((m) => `${m.role}: ${m.content}`).join("\n") +
          "\n\nNew message: "
        : "";
    }

    const lowerBody = body.toLowerCase().trim();
    const helpKeywords = ["help", "?", "commands", "what can you do", "what do you do", "how does this work"];

    if (helpKeywords.includes(lowerBody)) {
      const helpText = [
        "Here's what I can do:",
        "",
        "\u2022 Add a contact \u2014 \"Add John Smith as a lead\"",
        "\u2022 Update a contact \u2014 \"Mark Sarah as a client\"",
        "\u2022 Create a deal \u2014 \"New $50K deal for Main St\"",
        "\u2022 Move a deal \u2014 \"Move Johnson deal to negotiation\"",
        "\u2022 Create a task \u2014 \"Remind me to call Mike tomorrow\"",
        "\u2022 Complete a task \u2014 \"Mark follow-up call as done\"",
        "\u2022 Add a note \u2014 \"Note on Sarah: prefers email\"",
        "\u2022 Search anything \u2014 \"Show my pipeline\" or \"Who are my leads?\"",
        "\u2022 Show referrals \u2014 \"Show my referrals\"",
        "\u2022 Run ads \u2014 \"I need new business\" or \"Run a Facebook ad for $15/day\"",
        "\u2022 Check ad performance \u2014 \"How are my ads doing?\"",
        "\u2022 Pause/resume ads \u2014 \"Pause my Facebook campaign\"",
        "",
        "Just text me like you'd text a coworker. I'll figure it out.",
      ].join("\n");

      const outbound = await sendSMS(from, helpText);

      await prisma.$transaction([
        prisma.conversationMessage.create({
          data: {
            convId: conversation.id,
            role: "assistant",
            content: helpText,
            channel: "sms",
          },
        }),
        prisma.sMSMessage.create({
          data: {
            profileId,
            direction: "outbound",
            from: process.env.TWILIO_PHONE_NUMBER!,
            to: from,
            body: helpText,
            twilioSid: outbound.sid,
            status: "sent",
          },
        }),
      ]);

      return TWIML_EMPTY;
    }

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
          "\n\nI need your OK before I send that. Open Colony to approve it.";
      }

      recordUsage(profileId, LAM_LIMITS.ESTIMATED_COST_PER_REQUEST);
    } catch (error) {
      console.error("LAM SMS error:", error);
      replyText = "Sorry, I hit a snag on that one. Try again in a sec.";
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
      await sendSMS(from, "Sorry, I hit a snag on that one. Try again in a sec.");
    } catch {
      // Swallow — we already failed, don't mask the original error
    }

    return TWIML_EMPTY;
  }
}
