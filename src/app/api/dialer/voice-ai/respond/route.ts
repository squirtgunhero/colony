import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Voice AI conversation handler — Twilio sends speech-to-text results here.
 * We generate an AI response and return TwiML to continue the conversation.
 */
export async function POST(request: NextRequest) {
  const callId = request.nextUrl.searchParams.get("callId") || "";
  const contactName = decodeURIComponent(request.nextUrl.searchParams.get("contactName") || "there");
  const objective = request.nextUrl.searchParams.get("objective") || "qualify";
  const turn = parseInt(request.nextUrl.searchParams.get("turn") || "1");
  const scriptId = request.nextUrl.searchParams.get("scriptId") || null;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.colony.so";

  try {
    const formData = await request.formData();
    const speechResult = (formData.get("SpeechResult") as string) || "";
    const confidence = parseFloat((formData.get("Confidence") as string) || "0");

    // Load existing transcript
    const call = await prisma.call.findUnique({ where: { id: callId } });
    const transcript: { role: string; text: string; ts: string }[] = call?.aiTranscript
      ? JSON.parse(call.aiTranscript as string)
      : [];

    // Add user's speech to transcript
    if (speechResult) {
      transcript.push({ role: "contact", text: speechResult, ts: new Date().toISOString() });
    }

    // Check if contact wants to be transferred to a human agent
    const wantsTransfer = detectTransferRequest(speechResult);
    if (wantsTransfer && !call?.transferRequested) {
      // Look up the agent's name for a warm handoff
      const agentProfile = call?.userId
        ? await prisma.profile.findUnique({ where: { id: call.userId }, select: { fullName: true } })
        : null;
      const agentName = agentProfile?.fullName?.split(" ")[0] || "your agent";

      const handoffMessage = `Absolutely, let me connect you with ${agentName} right now. One moment please.`;
      transcript.push({ role: "ai", text: handoffMessage, ts: new Date().toISOString() });

      // Save transcript and mark transfer
      await prisma.call.update({
        where: { id: callId },
        data: {
          aiTranscript: JSON.stringify(transcript),
          transferRequested: true,
        },
      });

      // Redirect the call to the conference via TwiML
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapeXml(handoffMessage)}</Say>
  <Dial>
    <Conference waitUrl="" startConferenceOnEnter="true" endConferenceOnExit="true">transfer-${callId}</Conference>
  </Dial>
</Response>`;
      return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
    }

    // Check if conversation should end
    const shouldEnd = turn >= 8 || detectGoodbye(speechResult);

    let aiResponse: string;
    let appointmentSet = false;
    let appointmentDate: Date | null = null;
    let leadQualified: boolean | null = null;

    if (shouldEnd) {
      // Final turn — wrap up
      const analysis = await analyzeConversation(transcript, objective, contactName);
      aiResponse = analysis.closingMessage;
      appointmentSet = analysis.appointmentSet;
      appointmentDate = analysis.appointmentDate;
      leadQualified = analysis.leadQualified;

      // Save final state
      transcript.push({ role: "ai", text: aiResponse, ts: new Date().toISOString() });
      await prisma.call.update({
        where: { id: callId },
        data: {
          aiTranscript: JSON.stringify(transcript),
          aiSummary: analysis.summary,
          aiSentiment: analysis.sentiment,
          aiInterestScore: analysis.interestScore,
          appointmentSet,
          appointmentDate,
          leadQualified,
          outcome: appointmentSet ? "interested" : leadQualified ? "callback_requested" : "connected",
        },
      });

      // If the contact shows very high interest, trigger a transfer instead of ending
      if (analysis.interestScore >= 9 && !call?.transferRequested) {
        const agentProfile = call?.userId
          ? await prisma.profile.findUnique({ where: { id: call.userId }, select: { fullName: true } })
          : null;
        const agentName = agentProfile?.fullName?.split(" ")[0] || "your agent";

        const transferMessage = `You know what, ${contactName.split(" ")[0]}, you sound like a perfect fit. Let me get ${agentName} on the line right now so we can move things forward for you.`;
        transcript.push({ role: "ai", text: transferMessage, ts: new Date().toISOString() });

        await prisma.call.update({
          where: { id: callId },
          data: {
            aiTranscript: JSON.stringify(transcript),
            aiSummary: analysis.summary,
            aiSentiment: analysis.sentiment,
            aiInterestScore: analysis.interestScore,
            transferRequested: true,
          },
        });

        const transferTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapeXml(transferMessage)}</Say>
  <Dial>
    <Conference waitUrl="" startConferenceOnEnter="true" endConferenceOnExit="true">transfer-${callId}</Conference>
  </Dial>
</Response>`;
        return new NextResponse(transferTwiml, { headers: { "Content-Type": "text/xml" } });
      }

      // Create action items as CallAction records
      if (analysis.actionItems.length > 0) {
        const call = await prisma.call.findUnique({ where: { id: callId }, select: { userId: true } });
        if (call) {
          await prisma.callAction.createMany({
            data: analysis.actionItems.map((item) => ({
              callId,
              userId: call.userId,
              type: item.type,
              description: item.description,
              dueDate: item.dueDate ? new Date(item.dueDate) : null,
            })),
          });
        }
      }

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapeXml(aiResponse)}</Say>
  <Hangup/>
</Response>`;
      return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
    }

    // Generate AI response for this turn (use custom system prompt if scriptId provided)
    let customSystemPrompt: string | null = null;
    if (scriptId) {
      const script = await prisma.taraScript.findUnique({ where: { id: scriptId }, select: { systemPrompt: true } });
      if (script) customSystemPrompt = script.systemPrompt;
    }
    aiResponse = await generateResponse(transcript, objective, contactName, turn, customSystemPrompt);
    transcript.push({ role: "ai", text: aiResponse, ts: new Date().toISOString() });

    // Save transcript
    await prisma.call.update({
      where: { id: callId },
      data: { aiTranscript: JSON.stringify(transcript) },
    });

    const nextTurn = turn + 1;
    const scriptParam = scriptId ? `&amp;scriptId=${scriptId}` : "";
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" timeout="5" speechTimeout="auto" action="${baseUrl}/api/dialer/voice-ai/respond?callId=${callId}&amp;contactName=${encodeURIComponent(contactName)}&amp;objective=${objective}&amp;turn=${nextTurn}${scriptParam}" method="POST">
    <Say voice="Polly.Joanna">${escapeXml(aiResponse)}</Say>
  </Gather>
  <Say voice="Polly.Joanna">It sounds like you might need to go. Thank you so much for your time, ${escapeXml(contactName.split(" ")[0])}. We'll be in touch!</Say>
</Response>`;

    return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
  } catch (error) {
    console.error("Voice AI respond error:", error);
    // Graceful fallback
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">I appreciate your time. A member of our team will follow up with you shortly. Have a wonderful day!</Say>
  <Hangup/>
</Response>`;
    return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
  }
}

// Also handle GET
export async function GET(request: NextRequest) {
  return POST(request);
}

function detectGoodbye(text: string): boolean {
  const lower = text.toLowerCase();
  const goodbyePhrases = ["goodbye", "bye bye", "gotta go", "have to go", "not interested", "stop calling", "remove me", "do not call", "take me off"];
  return goodbyePhrases.some(p => lower.includes(p));
}

function detectTransferRequest(text: string): boolean {
  const lower = text.toLowerCase();
  const transferPhrases = [
    "speak to a person",
    "speak to a human",
    "speak with a person",
    "speak with a human",
    "speak with someone",
    "speak to someone",
    "talk to a person",
    "talk to a human",
    "talk to someone",
    "talk to the agent",
    "talk to an agent",
    "speak to the agent",
    "speak to an agent",
    "speak with the agent",
    "speak with an agent",
    "transfer me",
    "connect me",
    "real person",
    "real human",
    "actual person",
    "actual human",
    "human agent",
    "live agent",
    "live person",
    "can i speak",
    "let me talk",
    "put me through",
    "i want to talk to",
    "i'd like to speak",
    "i would like to speak",
  ];
  return transferPhrases.some(p => lower.includes(p));
}

async function generateResponse(
  transcript: { role: string; text: string }[],
  objective: string,
  contactName: string,
  turn: number,
  customSystemPrompt?: string | null
): Promise<string> {
  const firstName = contactName.split(" ")[0];
  const conversationHistory = transcript
    .map(t => `${t.role === "ai" ? "Tara" : firstName}: ${t.text}`)
    .join("\n");

  let systemPrompt: string;

  if (customSystemPrompt) {
    // Use the custom system prompt from the A/B test script
    // Replace placeholders
    systemPrompt = customSystemPrompt
      .replace(/\{contactName\}/g, contactName)
      .replace(/\{firstName\}/g, firstName)
      .replace(/\{turn\}/g, String(turn));
    // Append turn-based rules that are always needed
    systemPrompt += `\n\nThis is turn ${turn} of the conversation. ${turn >= 6 ? "Start wrapping up the conversation naturally." : ""}\nKeep responses BRIEF (1-3 sentences max). This is a phone call.`;
  } else {
    const objectiveInstructions: Record<string, string> = {
      qualify: `Your goal is to qualify this lead. Ask about:
- Their timeline for buying/selling
- What type of property they're looking for (location, size, budget)
- Whether they're pre-approved for a mortgage
- Their motivation (relocating, investing, first-time buyer, etc.)
Try to set an appointment if they seem interested.`,
      appointment: `Your primary goal is to set an appointment for a property showing or consultation.
- Suggest specific times (e.g., "Would tomorrow afternoon or Thursday morning work better?")
- Be flexible but persistent
- Confirm the appointment details before ending`,
      followup: `You're following up on a previous conversation.
- Ask if they've had time to think about what you discussed
- Address any concerns they might have
- Try to move them forward in the process`,
    };

    systemPrompt = `You are Tara, a friendly and professional real estate AI assistant for Colony Real Estate. You're on a live phone call with ${contactName}.

${objectiveInstructions[objective] || objectiveInstructions.qualify}

RULES:
- Keep responses BRIEF (1-3 sentences max). This is a phone call, not an email.
- Sound natural and conversational, not robotic.
- Be warm but professional. Use the contact's first name occasionally.
- If they express disinterest, be gracious and wrap up quickly.
- If they mention a specific time/date for meeting, confirm it.
- Don't repeat information you've already said.
- This is turn ${turn} of the conversation. ${turn >= 6 ? "Start wrapping up the conversation naturally." : ""}`;
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Here is the conversation so far:\n${conversationHistory}\n\nGenerate Tara's next response. Only output what Tara should say, nothing else.`,
        },
      ],
    });

    const text = response.content[0];
    if (text.type === "text") return text.text.trim();
    return "That's great to hear! Could you tell me a bit more about what you're looking for?";
  } catch {
    // Fallback responses by turn
    const fallbacks = [
      `That's really helpful, ${firstName}. What kind of timeline are you working with?`,
      `Great! And are you looking in any particular area or neighborhood?`,
      `That sounds wonderful. Would you be interested in scheduling a time to look at some properties?`,
      `Perfect. Would tomorrow afternoon or later this week work for a quick meeting?`,
      `I appreciate you sharing all that. Let me make sure we get you connected with the right agent.`,
    ];
    return fallbacks[Math.min(turn - 1, fallbacks.length - 1)];
  }
}

async function analyzeConversation(
  transcript: { role: string; text: string }[],
  objective: string,
  contactName: string
): Promise<{
  closingMessage: string;
  summary: string;
  sentiment: string;
  interestScore: number;
  appointmentSet: boolean;
  appointmentDate: Date | null;
  leadQualified: boolean;
  actionItems: { type: string; description: string; dueDate?: string }[];
}> {
  const conversationText = transcript
    .map(t => `${t.role === "ai" ? "Tara" : contactName}: ${t.text}`)
    .join("\n");

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: "You analyze real estate phone conversations and return JSON.",
      messages: [
        {
          role: "user",
          content: `Analyze this phone conversation and return a JSON object with these fields:
- closingMessage: A brief, friendly closing statement for Tara to say (1-2 sentences)
- summary: A 1-2 sentence summary of the call outcome
- sentiment: one of "positive", "neutral", "negative", "mixed"
- interestScore: integer 1-10, how interested the contact seems (10 = very interested)
- appointmentSet: boolean, whether an appointment/meeting was agreed upon
- appointmentDateStr: if appointment set, the date/time mentioned as ISO string, or null
- leadQualified: boolean, whether the lead seems genuinely interested
- actionItems: array of {type, description, dueDate?} objects. Types: "follow_up_call", "send_email", "schedule_showing", "create_task". Include specific follow-ups mentioned in the call.

Conversation:
${conversationText}

Return ONLY valid JSON, no other text.`,
        },
      ],
    });

    const text = response.content[0];
    if (text.type === "text") {
      const parsed = JSON.parse(text.text.trim());
      return {
        closingMessage: parsed.closingMessage || `Thank you for your time, ${contactName.split(" ")[0]}. We'll be in touch soon!`,
        summary: parsed.summary || "Call completed",
        sentiment: parsed.sentiment || "neutral",
        interestScore: Math.min(10, Math.max(1, parseInt(parsed.interestScore) || 5)),
        appointmentSet: parsed.appointmentSet || false,
        appointmentDate: parsed.appointmentDateStr ? new Date(parsed.appointmentDateStr) : null,
        leadQualified: parsed.leadQualified || false,
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      };
    }
  } catch {
    // Fallback
  }

  return {
    closingMessage: `Thank you so much for your time, ${contactName.split(" ")[0]}. It was great speaking with you. We'll follow up with more details soon. Have a wonderful day!`,
    summary: "Call completed — needs follow-up review",
    sentiment: "neutral",
    interestScore: 5,
    appointmentSet: false,
    appointmentDate: null,
    leadQualified: false,
    actionItems: [],
  };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
