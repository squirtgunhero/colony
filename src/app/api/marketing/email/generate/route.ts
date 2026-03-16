// ============================================================================
// POST /api/marketing/email/generate — AI email content generation
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultProvider } from "@/lam/llm";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const { type, propertyId, prompt, tone } = body;

    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { fullName: true, businessType: true, serviceAreaCity: true },
    });

    let propertyContext = "";
    if (propertyId) {
      const property = await prisma.property.findFirst({
        where: { id: propertyId, userId },
      });
      if (property) {
        propertyContext = `\nProperty: ${property.address || ""}, ${property.city || ""}, ${property.state || ""}. ${property.bedrooms || "?"} bed, ${property.bathrooms || "?"} bath, ${property.sqft || "?"} sqft. Price: $${property.price?.toLocaleString() || "TBD"}.`;
      }
    }

    const typeGuidance: Record<string, string> = {
      new_listing: "Write an email announcing a new property listing. Create excitement about the property and include a CTA to schedule a showing.",
      open_house: "Write an email inviting recipients to an open house event. Include urgency and key property details.",
      just_sold: "Write a \"just sold\" email to build social proof. Show success and invite new clients.",
      market_update: "Write a market update email with local real estate trends. Position the agent as an expert.",
      newsletter: "Write a monthly real estate newsletter with market insights, tips, and a personal touch.",
      follow_up: "Write a follow-up email to a lead. Be personal, helpful, and include a soft CTA.",
      drip_welcome: "Write a welcome email for a new lead drip campaign. Introduce the agent and set expectations.",
      price_reduction: "Write an email announcing a price reduction. Create urgency without desperation.",
    };

    const toneGuidance: Record<string, string> = {
      professional: "Use a professional, polished tone.",
      friendly: "Use a warm, friendly, conversational tone.",
      urgent: "Use an urgent, time-sensitive tone with scarcity language.",
      luxury: "Use an elevated, luxury-market tone with sophisticated language.",
    };

    const systemPrompt = `You are a real estate email marketing copywriter. Generate a professional email for a real estate agent.

Agent: ${profile?.fullName || "Agent"}
Business: ${profile?.businessType || "Real estate"}
Area: ${profile?.serviceAreaCity || "local market"}
${propertyContext}

${typeGuidance[type] || "Write an engaging real estate marketing email."}
${toneGuidance[tone] || toneGuidance.professional}

Respond with ONLY a JSON object (no markdown, no code fences):
- "subject": compelling email subject line (string)
- "previewText": preview/preheader text, 40-90 chars (string)
- "greeting": personalized greeting (string)
- "body": email body with paragraphs separated by \\n\\n (string)
- "cta": call-to-action button text (string)
- "closing": sign-off (string)`;

    const llm = getDefaultProvider();
    const result = await llm.complete(
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: prompt || `Generate a ${type || "general"} email.`,
        },
      ],
      { temperature: 0.8, maxTokens: 1200 }
    );

    let generated;
    try {
      generated = JSON.parse(result.content);
    } catch {
      generated = {
        subject: "Your Real Estate Update",
        previewText: "",
        greeting: "Hi there,",
        body: result.content,
        cta: "Learn More",
        closing: `Best regards,\n${profile?.fullName || "Your Agent"}`,
      };
    }

    return NextResponse.json({ generated, usage: result.usage });
  } catch (error) {
    console.error("Email generate error:", error);
    const message =
      error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
