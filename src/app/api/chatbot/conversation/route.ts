import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

function createId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 25);
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * POST /api/chatbot/conversation
 * Public endpoint — handles visitor messages in the chat widget.
 *
 * Actions:
 *   - action: "start"   → Creates a new conversation, returns conversationId + welcome message
 *   - action: "message"  → Visitor sends a message, bot responds (qualification or AI)
 *   - action: "qualify"  → Visitor submits a qualification answer
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "start":
        return handleStart(body);
      case "message":
        return handleMessage(body);
      case "qualify":
        return handleQualify(body);
      default:
        return NextResponse.json(
          { error: "Invalid action. Use: start, message, or qualify" },
          { status: 400, headers: CORS_HEADERS }
        );
    }
  } catch (error) {
    console.error("[chatbot/conversation] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

/**
 * Start a new conversation
 */
async function handleStart(body: {
  embedToken: string;
  visitorId: string;
  pageUrl?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}) {
  const { embedToken, visitorId, pageUrl, referrer, utmSource, utmMedium, utmCampaign } = body;

  if (!embedToken || !visitorId) {
    return NextResponse.json(
      { error: "embedToken and visitorId are required" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // Find the bot
  const bot = await prisma.honeycombChatBot.findUnique({
    where: { embedToken },
  });

  if (!bot || bot.status !== "active") {
    return NextResponse.json(
      { error: "Chat bot not found or inactive" },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  // Check for existing active conversation from this visitor
  const existing = await prisma.chatBotConversation.findFirst({
    where: {
      botId: bot.id,
      visitorId,
      status: "active",
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (existing) {
    return NextResponse.json({
      conversationId: existing.id,
      messages: existing.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        questionId: m.questionId,
        fieldMapping: m.fieldMapping,
        createdAt: m.createdAt.toISOString(),
      })),
      qualificationData: existing.qualificationData,
      qualificationComplete: existing.qualificationComplete,
    }, { headers: CORS_HEADERS });
  }

  // Create new conversation
  const conversationId = createId();
  const conversation = await prisma.chatBotConversation.create({
    data: {
      id: conversationId,
      botId: bot.id,
      visitorId,
      pageUrl,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
    },
  });

  // Send welcome message if configured
  const messages: Array<{
    id: string;
    role: string;
    content: string;
    questionId?: string;
    fieldMapping?: string;
    createdAt: string;
  }> = [];

  if (bot.welcomeMessage) {
    const welcomeMsg = await prisma.chatBotMessage.create({
      data: {
        id: createId(),
        conversationId: conversation.id,
        role: "bot",
        content: bot.welcomeMessage,
      },
    });
    messages.push({
      id: welcomeMsg.id,
      role: welcomeMsg.role,
      content: welcomeMsg.content,
      createdAt: welcomeMsg.createdAt.toISOString(),
    });
  }

  // Increment conversation count
  await prisma.honeycombChatBot.update({
    where: { id: bot.id },
    data: { conversationCount: { increment: 1 } },
  });

  return NextResponse.json({
    conversationId: conversation.id,
    messages,
    qualificationData: {},
    qualificationComplete: false,
  }, { status: 201, headers: CORS_HEADERS });
}

/**
 * Handle a visitor message
 */
async function handleMessage(body: {
  conversationId: string;
  content: string;
}) {
  const { conversationId, content } = body;

  if (!conversationId || !content) {
    return NextResponse.json(
      { error: "conversationId and content are required" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const conversation = await prisma.chatBotConversation.findUnique({
    where: { id: conversationId },
    include: {
      bot: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  // Save visitor message
  const visitorMsg = await prisma.chatBotMessage.create({
    data: {
      id: createId(),
      conversationId,
      role: "visitor",
      content,
    },
  });

  // Update last message timestamp
  await prisma.chatBotConversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  // Check if we should start qualification flow
  const messageCount = conversation.messages.filter((m) => m.role === "visitor").length + 1;
  const qualFlow = (conversation.bot.qualificationFlow as Array<{
    id: string;
    question: string;
    fieldMapping: string;
    inputType: string;
    required: boolean;
    options?: string[];
  }>) ?? [];

  let botResponse: {
    id: string;
    role: string;
    content: string;
    questionId?: string;
    fieldMapping?: string;
    createdAt: string;
  } | null = null;

  // If qualification flow exists and we've hit the threshold, start asking questions
  if (
    qualFlow.length > 0 &&
    !conversation.qualificationComplete &&
    messageCount >= conversation.bot.collectLeadAfter
  ) {
    // Find the next unanswered qualification question
    const qualData = (conversation.qualificationData ?? {}) as Record<string, string>;
    const answeredFields = Object.keys(qualData);
    const nextQuestion = qualFlow.find((q) => !answeredFields.includes(q.fieldMapping));

    if (nextQuestion) {
      const botMsg = await prisma.chatBotMessage.create({
        data: {
          id: createId(),
          conversationId,
          role: "bot",
          content: nextQuestion.question,
          questionId: nextQuestion.id,
          fieldMapping: nextQuestion.fieldMapping,
        },
      });

      botResponse = {
        id: botMsg.id,
        role: botMsg.role,
        content: botMsg.content,
        questionId: botMsg.questionId ?? undefined,
        fieldMapping: botMsg.fieldMapping ?? undefined,
        createdAt: botMsg.createdAt.toISOString(),
      };
    } else {
      // All questions answered — mark qualification complete
      await prisma.chatBotConversation.update({
        where: { id: conversationId },
        data: { qualificationComplete: true },
      });

      // Create a lead (Contact) from collected data
      await convertToLead(conversation.id, conversation.botId);

      const completionMsg = await prisma.chatBotMessage.create({
        data: {
          id: createId(),
          conversationId,
          role: "bot",
          content: "Thank you! I've got all the information I need. A team member will be in touch shortly.",
        },
      });

      botResponse = {
        id: completionMsg.id,
        role: completionMsg.role,
        content: completionMsg.content,
        createdAt: completionMsg.createdAt.toISOString(),
      };
    }
  } else if (qualFlow.length === 0 || conversation.qualificationComplete) {
    // No qualification flow or already complete — simple acknowledgment
    // In a full implementation, this would call an AI model to generate responses
    const botMsg = await prisma.chatBotMessage.create({
      data: {
        id: createId(),
        conversationId,
        role: "bot",
        content: "Thanks for your message! A team member will follow up with you shortly.",
      },
    });

    botResponse = {
      id: botMsg.id,
      role: botMsg.role,
      content: botMsg.content,
      createdAt: botMsg.createdAt.toISOString(),
    };
  }

  return NextResponse.json({
    visitorMessage: {
      id: visitorMsg.id,
      role: visitorMsg.role,
      content: visitorMsg.content,
      createdAt: visitorMsg.createdAt.toISOString(),
    },
    botResponse,
    qualificationComplete: conversation.qualificationComplete,
  }, { headers: CORS_HEADERS });
}

/**
 * Handle a qualification answer
 */
async function handleQualify(body: {
  conversationId: string;
  questionId: string;
  fieldMapping: string;
  value: string;
}) {
  const { conversationId, questionId, fieldMapping, value } = body;

  if (!conversationId || !fieldMapping || !value) {
    return NextResponse.json(
      { error: "conversationId, fieldMapping, and value are required" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const conversation = await prisma.chatBotConversation.findUnique({
    where: { id: conversationId },
    include: { bot: true },
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  // Save visitor answer as message
  await prisma.chatBotMessage.create({
    data: {
      id: createId(),
      conversationId,
      role: "visitor",
      content: value,
      questionId,
      fieldMapping,
    },
  });

  // Update qualification data
  const qualData = (conversation.qualificationData ?? {}) as Record<string, string>;
  qualData[fieldMapping] = value;

  // Also update specific visitor fields
  const visitorUpdate: Record<string, string> = {};
  if (fieldMapping === "name") visitorUpdate.visitorName = value;
  if (fieldMapping === "email") visitorUpdate.visitorEmail = value;
  if (fieldMapping === "phone") visitorUpdate.visitorPhone = value;

  await prisma.chatBotConversation.update({
    where: { id: conversationId },
    data: {
      qualificationData: qualData,
      lastMessageAt: new Date(),
      ...visitorUpdate,
    },
  });

  // Determine next question
  const qualFlow = (conversation.bot.qualificationFlow as Array<{
    id: string;
    question: string;
    fieldMapping: string;
    inputType: string;
    required: boolean;
    options?: string[];
  }>) ?? [];

  const answeredFields = Object.keys(qualData);
  const nextQuestion = qualFlow.find((q) => !answeredFields.includes(q.fieldMapping));

  let botResponse: {
    id: string;
    role: string;
    content: string;
    questionId?: string;
    fieldMapping?: string;
    inputType?: string;
    options?: string[];
    createdAt: string;
  } | null = null;

  let qualificationComplete = false;

  if (nextQuestion) {
    const botMsg = await prisma.chatBotMessage.create({
      data: {
        id: createId(),
        conversationId,
        role: "bot",
        content: nextQuestion.question,
        questionId: nextQuestion.id,
        fieldMapping: nextQuestion.fieldMapping,
      },
    });

    botResponse = {
      id: botMsg.id,
      role: botMsg.role,
      content: botMsg.content,
      questionId: nextQuestion.id,
      fieldMapping: nextQuestion.fieldMapping,
      inputType: nextQuestion.inputType,
      options: nextQuestion.options,
      createdAt: botMsg.createdAt.toISOString(),
    };
  } else {
    // All questions answered
    qualificationComplete = true;

    await prisma.chatBotConversation.update({
      where: { id: conversationId },
      data: { qualificationComplete: true },
    });

    // Convert to lead
    await convertToLead(conversationId, conversation.botId);

    const completionMsg = await prisma.chatBotMessage.create({
      data: {
        id: createId(),
        conversationId,
        role: "bot",
        content: "Thank you! I've captured all your details. A team member will reach out to you soon.",
      },
    });

    botResponse = {
      id: completionMsg.id,
      role: completionMsg.role,
      content: completionMsg.content,
      createdAt: completionMsg.createdAt.toISOString(),
    };
  }

  return NextResponse.json({
    qualificationData: qualData,
    qualificationComplete,
    botResponse,
  }, { headers: CORS_HEADERS });
}

/**
 * Convert a qualified conversation into a Contact (lead)
 */
async function convertToLead(conversationId: string, botId: string) {
  try {
    const conversation = await prisma.chatBotConversation.findUnique({
      where: { id: conversationId },
      include: { bot: true },
    });

    if (!conversation) return;

    const qualData = (conversation.qualificationData ?? {}) as Record<string, string>;
    const name = qualData.name || conversation.visitorName || "Chat Visitor";
    const email = qualData.email || conversation.visitorEmail;

    if (!email) {
      console.log("[chatbot] Cannot create lead without email");
      return;
    }

    // Check if contact already exists with this email for this user
    const existingContact = await prisma.contact.findFirst({
      where: {
        email,
        userId: conversation.bot.userId,
      },
    });

    if (existingContact) {
      // Link conversation to existing contact
      await prisma.chatBotConversation.update({
        where: { id: conversationId },
        data: { contactId: existingContact.id },
      });
      return;
    }

    // Create new contact
    const contact = await prisma.contact.create({
      data: {
        name,
        email,
        phone: qualData.phone || conversation.visitorPhone || undefined,
        source: "chatbot",
        type: "lead",
        userId: conversation.bot.userId,
        tags: ["chatbot_lead", `bot:${conversation.bot.name}`],
        notes: buildLeadNotes(qualData, conversation.bot.name),
        campaignChannel: "chatbot",
        utmSource: conversation.utmSource || undefined,
        utmMedium: conversation.utmMedium || undefined,
        utmCampaign: conversation.utmCampaign || undefined,
        landingPage: conversation.pageUrl || undefined,
      },
    });

    // Link conversation to the new contact
    await prisma.chatBotConversation.update({
      where: { id: conversationId },
      data: { contactId: contact.id },
    });

    // Create attribution record
    if (conversation.utmSource || conversation.pageUrl) {
      try {
        await prisma.leadAttribution.create({
          data: {
            contactId: contact.id,
            channel: "chatbot",
            campaignName: conversation.bot.name,
            utmSource: conversation.utmSource || undefined,
            utmMedium: conversation.utmMedium || undefined,
            utmCampaign: conversation.utmCampaign || undefined,
            landingPage: conversation.pageUrl || undefined,
            referrer: conversation.referrer || undefined,
            touchType: "first",
          },
        });
      } catch (e) {
        console.error("[chatbot] Failed to create attribution:", e);
      }
    }

    console.log(`[chatbot] Created lead: ${contact.id} from conversation: ${conversationId}`);
  } catch (error) {
    console.error("[chatbot] Failed to convert to lead:", error);
  }
}

function buildLeadNotes(qualData: Record<string, string>, botName: string): string {
  const lines = [`Qualified via Chat Studio bot: ${botName}`];
  if (qualData.budget) lines.push(`Budget: ${qualData.budget}`);
  if (qualData.timeline) lines.push(`Timeline: ${qualData.timeline}`);
  if (qualData.service_area) lines.push(`Service Area: ${qualData.service_area}`);
  if (qualData.property_type) lines.push(`Property Type: ${qualData.property_type}`);
  if (qualData.notes) lines.push(`Notes: ${qualData.notes}`);
  return lines.join("\n");
}

/**
 * OPTIONS — CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
