import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST — Process pending AI engagements (called by cron or webhook)
// This generates AI messages and sends them to leads
export async function POST() {
  const now = new Date();

  // Find engagements due for follow-up
  const pending = await prisma.aIEngagement.findMany({
    where: {
      status: "active",
      nextFollowUp: { lte: now },
    },
    include: {
      contact: { select: { id: true, name: true, email: true, phone: true, source: true, tags: true, type: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 10 },
    },
    take: 50,
  });

  const results: { id: string; action: string }[] = [];

  for (const eng of pending) {
    try {
      // Build conversation context for AI
      const contactName = eng.contact.name.split(" ")[0]; // First name
      const messageHistory = eng.messages
        .reverse()
        .map((m) => `${m.role === "assistant" ? "Tara" : contactName}: ${m.content}`)
        .join("\n");

      // Determine what message to send based on state
      let aiMessage: string;
      let nextDelay: number; // hours until next follow-up

      if (eng.messageCount === 0) {
        // First touch — speed to lead
        aiMessage = generateFirstTouch(contactName, eng.contact.source, eng.aiObjective);
        nextDelay = 24; // Follow up in 24h if no response
      } else if (!eng.lastReplyAt) {
        // No reply yet — follow up
        if (eng.messageCount >= 5) {
          // Mark as unresponsive after 5 attempts
          await prisma.aIEngagement.update({
            where: { id: eng.id },
            data: { status: "unresponsive", nextFollowUp: null },
          });
          results.push({ id: eng.id, action: "marked_unresponsive" });
          continue;
        }
        aiMessage = generateFollowUp(contactName, eng.messageCount, eng.aiObjective);
        nextDelay = eng.messageCount <= 2 ? 24 : 48; // Slow down over time
      } else {
        // Has replied — continue conversation based on objective
        aiMessage = generateConversationReply(contactName, messageHistory, eng.aiObjective);
        nextDelay = 2; // Respond quickly when engaged
      }

      // Save the message
      await prisma.aIEngagementMessage.create({
        data: {
          engagementId: eng.id,
          role: "assistant",
          content: aiMessage,
          channel: eng.channel,
        },
      });

      // Update engagement
      const nextFollowUp = new Date(now.getTime() + nextDelay * 60 * 60 * 1000);
      await prisma.aIEngagement.update({
        where: { id: eng.id },
        data: {
          messageCount: { increment: 1 },
          lastMessageAt: now,
          nextFollowUp,
          summary: `Sent ${eng.messageCount + 1} messages. Objective: ${eng.aiObjective}. ${eng.lastReplyAt ? "Lead has responded." : "Awaiting response."}`,
        },
      });

      // Create activity record
      await prisma.activity.create({
        data: {
          userId: eng.userId,
          contactId: eng.contactId,
          type: eng.channel === "sms" ? "call" : "email",
          title: `AI ${eng.channel.toUpperCase()} sent to ${eng.contact.name}`,
          description: aiMessage,
          metadata: JSON.stringify({ aiEngagementId: eng.id, channel: eng.channel }),
        },
      });

      results.push({ id: eng.id, action: "message_sent" });
    } catch (error) {
      console.error(`Failed to process engagement ${eng.id}:`, error);
      results.push({ id: eng.id, action: "error" });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}

// ----- Message generation functions -----
// These generate contextual messages. In production, these would call Claude API.

function generateFirstTouch(name: string, source: string | null, objective: string): string {
  const sourceContext = source
    ? {
        zillow: "I saw you were browsing listings on Zillow",
        website: "Thanks for visiting our website",
        referral: "I was referred to you",
        social: "I noticed your interest from social media",
        open_house: "Great meeting you at the open house",
        meta_ads: "Thanks for your interest from our ad",
        google_ads: "Thanks for reaching out through our listing",
      }[source] || "Thanks for your interest"
    : "Thanks for your interest";

  if (objective === "qualify") {
    return `Hi ${name}! This is Tara from Colony Real Estate. ${sourceContext}. I'd love to help you with your home search. Are you looking to buy or sell? What area are you interested in?`;
  }
  if (objective === "schedule_showing") {
    return `Hi ${name}! This is Tara from Colony Real Estate. ${sourceContext}. Would you like to schedule a showing? I have some great times available this week.`;
  }
  if (objective === "re_engage") {
    return `Hi ${name}! It's Tara from Colony Real Estate. It's been a while since we last connected. Are you still interested in exploring real estate opportunities? The market has some exciting new listings.`;
  }
  return `Hi ${name}! This is Tara from Colony Real Estate. ${sourceContext}. How can I help you today?`;
}

function generateFollowUp(name: string, attemptNum: number, objective: string): string {
  const followUps = [
    `Hi ${name}, just checking in! Did you have a chance to think about what you're looking for in a home? I'm here to help whenever you're ready.`,
    `Hey ${name}! I wanted to follow up — I have some great new listings that might interest you. Would you like me to send some over?`,
    `Hi ${name}, hope you're doing well! The market is moving quickly and I'd hate for you to miss out. Can we chat about your timeline?`,
    `${name}, just a quick note — I'm still here to help whenever you're ready to explore your options. No pressure at all!`,
  ];

  return followUps[Math.min(attemptNum - 1, followUps.length - 1)];
}

function generateConversationReply(name: string, _history: string, objective: string): string {
  // In production, this would use Claude API with the conversation history
  if (objective === "qualify") {
    return `That's great to hear, ${name}! To better help you, could you tell me your ideal price range and how many bedrooms you're looking for? Also, is there a specific timeline you're working with?`;
  }
  if (objective === "schedule_showing") {
    return `Perfect! I have availability this week. Would morning or afternoon work better for you? I can also arrange virtual tours if that's more convenient.`;
  }
  return `Thanks for getting back to me, ${name}! I'd love to learn more about what you're looking for so I can find the perfect match for you.`;
}
