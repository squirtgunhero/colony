// Marketing Domain Executors — Content & Image Generation
import { prisma } from "@/lib/prisma";
import { getDefaultProvider } from "../llm";
import type { ActionExecutor } from "../types";

export const marketingExecutors: Record<string, ActionExecutor> = {
  "marketing.generate_image": async (action, ctx) => {
    if (action.type !== "marketing.generate_image") throw new Error("Invalid action type");

    const payload = action.payload as {
      type?: string;
      propertyId?: string;
      custom_prompt?: string;
      size?: string;
    };

    if (!process.env.OPENAI_API_KEY) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "Image generation is not configured. Add your OpenAI API key in Settings to enable AI image generation.",
      };
    }

    try {
      const { generateImage, buildAdImagePrompt } = await import("@/lib/image-gen");

      const profile = await prisma.profile.findUnique({
        where: { id: ctx.user_id },
        select: { businessType: true, serviceAreaCity: true },
      });

      let propertyDetails: Record<string, unknown> | undefined;
      if (payload.propertyId) {
        const prop = await prisma.property.findFirst({
          where: { id: payload.propertyId, userId: ctx.user_id },
        });
        if (prop) {
          propertyDetails = {
            address: prop.address,
            bedrooms: prop.bedrooms,
            bathrooms: prop.bathrooms ? Number(prop.bathrooms) : undefined,
            sqft: prop.sqft,
            price: prop.price ? Number(prop.price) : undefined,
          };
        }
      }

      const prompt = payload.custom_prompt || buildAdImagePrompt({
        type: payload.type || "general",
        city: profile?.serviceAreaCity || undefined,
        businessType: profile?.businessType || undefined,
        propertyDetails: propertyDetails as Parameters<typeof buildAdImagePrompt>[0]["propertyDetails"],
      });

      const result = await generateImage({
        prompt,
        size: (payload.size as "1024x1024" | "1792x1024" | "1024x1792") || "1024x1024",
      });

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: {
          image_url: result.url,
          revised_prompt: result.revised_prompt,
          note: "Here's your AI-generated marketing image! You can use this for your ads, social posts, or email campaigns. The image URL is valid for about 1 hour — download it or use it right away.",
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image generation failed";
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Image generation failed: ${message}`,
      };
    }
  },

  "marketing.generate_content": async (action, ctx) => {
    if (action.type !== "marketing.generate_content") throw new Error("Invalid action type");

    const payload = action.payload as {
      type?: string;
      platform?: string;
      propertyId?: string;
      prompt?: string;
    };

    try {
      const profile = await prisma.profile.findUnique({
        where: { id: ctx.user_id },
        select: { fullName: true, businessType: true, serviceAreaCity: true },
      });

      let propertyContext = "";
      if (payload.propertyId) {
        const property = await prisma.property.findFirst({
          where: { id: payload.propertyId, userId: ctx.user_id },
        });
        if (property) {
          propertyContext = `\nProperty: ${property.address || ""}, ${property.city || ""}, ${property.state || ""}. ${property.bedrooms || "?"} bed, ${property.bathrooms || "?"} bath, ${property.sqft || "?"} sqft. Price: $${property.price?.toLocaleString() || "TBD"}.`;
        }
      }

      const platformGuide: Record<string, string> = {
        facebook: "Write for Facebook. Conversational, engaging. 1-3 paragraphs. Include emojis sparingly.",
        instagram: "Write for Instagram. Hook first. Line breaks. 5-10 hashtags at end.",
        linkedin: "Write for LinkedIn. Professional but personable. 2-4 paragraphs.",
        email: "Write an email with subject line, preview text, and body.",
        generic: "Write versatile marketing copy for any channel.",
      };

      const typeGuide: Record<string, string> = {
        new_listing: "Announce a new listing. Highlight key features.",
        open_house: "Promote an open house event with urgency.",
        just_sold: "Celebrate a just-sold property. Build social proof.",
        market_update: "Share local market trends and insights.",
        ad_copy: "Create lead-gen ad copy with strong CTA.",
        general: "Create engaging real estate marketing content.",
      };

      const llm = getDefaultProvider();
      const result = await llm.complete([
        {
          role: "system",
          content: `You are a real estate marketing copywriter.\n\nAgent: ${profile?.fullName || "Agent"}\nBusiness: ${profile?.businessType || "Real estate"}\nArea: ${profile?.serviceAreaCity || "local market"}${propertyContext}\n\n${platformGuide[payload.platform || "generic"] || platformGuide.generic}\n${typeGuide[payload.type || "general"] || typeGuide.general}\n\nRespond with ONLY a JSON object: headline (string), body (string), cta (string), hashtags (string[]).`,
        },
        {
          role: "user",
          content: payload.prompt || `Generate a ${payload.type || "general"} post for ${payload.platform || "social media"}.`,
        },
      ], { temperature: 0.8, maxTokens: 1000 });

      let generated;
      try {
        generated = JSON.parse(result.content);
      } catch {
        generated = { headline: "", body: result.content, cta: "", hashtags: [] };
      }

      const fullContent = [generated.headline, generated.body, generated.cta, generated.hashtags?.join(" ")].filter(Boolean).join("\n\n");

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: {
          ...generated,
          full_content: fullContent,
          note: `Here's your ${payload.type || "marketing"} content for ${payload.platform || "social media"}:\n\n${fullContent}`,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Content generation failed";
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Content generation failed: ${message}`,
      };
    }
  },
};
