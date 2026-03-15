// ============================================================================
// POST /api/marketing/generate — AI content generation
// Generates marketing copy using Claude
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultProvider } from "@/lam/llm";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const { type, prompt, platform, propertyId } = body;

    // Get user profile for context
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { fullName: true, businessType: true, serviceAreaCity: true },
    });

    // Optionally get property details for listing-specific content
    let propertyContext = "";
    if (propertyId) {
      const property = await prisma.property.findFirst({
        where: { id: propertyId, userId },
      });
      if (property) {
        propertyContext = `\nProperty details: ${property.address || ""}, ${property.city || ""}, ${property.state || ""}. ${property.bedrooms || "?"} bed, ${property.bathrooms || "?"} bath, ${property.sqft || "?"} sqft. Price: $${property.price?.toLocaleString() || "TBD"}.`;
      }
    }

    const platformGuidance: Record<string, string> = {
      facebook: "Write for Facebook. Use a conversational, engaging tone. 1-3 short paragraphs. Include relevant emojis sparingly. End with a clear call-to-action.",
      instagram: "Write for Instagram. Start with a hook. Use line breaks for readability. Include 5-10 relevant hashtags at the end. Keep it visual and aspirational.",
      linkedin: "Write for LinkedIn. Professional but personable tone. Focus on market insights and expertise. 2-4 paragraphs. No hashtags in the body.",
      google: "Write Google Ads copy. Headline max 30 chars, description max 90 chars. Be direct and action-oriented. Include keywords naturally.",
      email: "Write an email. Include a compelling subject line, preview text, and body. Keep paragraphs short. Include a clear CTA button text.",
      generic: "Write versatile marketing copy that works across channels.",
    };

    const typeGuidance: Record<string, string> = {
      new_listing: "Create content announcing a new property listing. Highlight key features and create excitement.",
      open_house: "Create content promoting an open house event. Include urgency and key details (implied date/time placeholder).",
      just_sold: "Create content celebrating a just-sold property. Build social proof and attract new clients.",
      market_update: "Create a local real estate market update. Share insights, trends, and position yourself as an expert.",
      price_reduction: "Create content announcing a price reduction. Create urgency without desperation.",
      testimonial: "Create a client testimonial post template. Focus on the client experience and results.",
      ad_copy: "Create advertising copy designed to generate leads. Strong headline, clear value proposition, compelling CTA.",
      general: "Create engaging real estate marketing content.",
    };

    const systemPrompt = `You are a real estate marketing copywriter. Generate professional, engaging content for a real estate agent.

Agent: ${profile?.fullName || "Agent"}
Business: ${profile?.businessType || "Real estate"}
Area: ${profile?.serviceAreaCity || "local market"}
${propertyContext}

${platformGuidance[platform] || platformGuidance.generic}
${typeGuidance[type] || typeGuidance.general}

Respond with ONLY a JSON object (no markdown, no code fences) with these fields:
- "headline": a compelling headline or hook (string)
- "body": the main content (string, use \\n for line breaks)
- "cta": call-to-action text (string)
- "hashtags": array of relevant hashtags (string[]), empty if not applicable`;

    const llm = getDefaultProvider();
    const result = await llm.complete([
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt || `Generate a ${type || "general"} post for ${platform || "social media"}.` },
    ], { temperature: 0.8, maxTokens: 1000 });

    let generated;
    try {
      generated = JSON.parse(result.content);
    } catch {
      generated = {
        headline: "",
        body: result.content,
        cta: "",
        hashtags: [],
      };
    }

    return NextResponse.json({
      generated,
      usage: result.usage,
    });
  } catch (error) {
    console.error("Marketing generate error:", error);
    const message = error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
