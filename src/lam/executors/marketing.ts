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
          __action_card: {
            type: "generated_image",
            data: {
              image_url: result.url,
              revised_prompt: result.revised_prompt,
            },
          },
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

  "marketing.generate_landing_page": async (action, ctx) => {
    if (action.type !== "marketing.generate_landing_page") throw new Error("Invalid action type");

    const payload = action.payload as {
      lead_type?: string;
      target_city?: string;
      campaign_name?: string;
      headline?: string;
      description?: string;
      style?: string;
      include_listings?: boolean;
      custom_prompt?: string;
    };

    try {
      const { generateSite } = await import("@/lib/site-builder");

      const profile = await prisma.profile.findUnique({
        where: { id: ctx.user_id },
        select: { fullName: true, businessType: true, serviceAreaCity: true },
      });

      const agentName = profile?.fullName || "Agent";
      const city = payload.target_city || profile?.serviceAreaCity || "your area";
      const leadType = payload.lead_type?.toLowerCase() || "seller";
      const style = payload.style || "luxury";
      const campaignLabel = payload.campaign_name || "Lead Generation";

      // Build a descriptive site name
      const siteName = `${campaignLabel} - ${city}`;
      const baseSlug = siteName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48);
      const slug = `${baseSlug}-${Date.now().toString(36)}`;

      // Create the landing page record
      const site = await prisma.landingPage.create({
        data: {
          userId: ctx.user_id,
          name: siteName,
          slug,
          status: "draft",
          contentJson: {},
          siteType: "landing_page",
        },
      });

      // Build the generation prompt based on lead type
      let prompt: string;

      if (payload.custom_prompt) {
        prompt = payload.custom_prompt;
      } else if (leadType === "seller" || leadType === "both") {
        prompt = `Create a ${style} real estate landing page for ${agentName}${profile?.businessType ? ` (${profile.businessType})` : ""} targeting home sellers in ${city}.

The page should:
- Have a compelling hero section with headline: "${payload.headline || `What's Your Home Worth in ${city}?`}"
- Include a prominent home valuation request form (name, email, phone, property address)
- Show why sellers should choose ${agentName} — local expertise, track record, marketing reach
- Include a section about the local ${city} market with urgency ("homes selling fast", "low inventory")
${payload.description ? `- Feature this message: "${payload.description}"` : ""}
${payload.include_listings ? "- Show available listings from CRM data to demonstrate market activity" : ""}
- Strong CTA: "Get Your Free Home Valuation"
- Mobile-optimized, fast-loading
- Color palette: dark/premium with gold accents for the ${style} feel`;
      } else {
        prompt = `Create a ${style} real estate landing page for ${agentName}${profile?.businessType ? ` (${profile.businessType})` : ""} targeting home buyers in ${city}.

The page should:
- Have a compelling hero section with headline: "${payload.headline || `Find Your Dream Home in ${city}`}"
- Include a property search/inquiry form (name, email, phone, desired area, budget range, bedrooms)
- Show why buyers should work with ${agentName} — local knowledge, exclusive listings, negotiation expertise
- Include a section about the ${city} market — neighborhoods, schools, lifestyle
${payload.description ? `- Feature this message: "${payload.description}"` : ""}
${payload.include_listings ? "- Display featured listings from CRM data" : ""}
- Strong CTA: "Start Your Home Search" or "See Available Homes"
- Mobile-optimized, fast-loading
- Color palette: dark/premium with gold accents for the ${style} feel`;
      }

      // Generate the HTML using the site builder (which uses Claude)
      const result = await generateSite({
        siteId: site.id,
        userId: ctx.user_id,
        prompt,
      });

      // Auto-publish the landing page so it's immediately usable for ads
      await prisma.landingPage.update({
        where: { id: site.id },
        data: {
          status: "published",
          publishedAt: new Date(),
        },
      });

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mycolonyhq.com";
      const publicUrl = `${baseUrl}/s/${slug}`;
      const editUrl = `/marketing/sites/${site.id}`;

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: {
          site_id: site.id,
          slug,
          public_url: publicUrl,
          edit_url: editUrl,
          version: result.version,
          tokens_used: result.tokensUsed,
          note: `Your landing page is live! You can view it at ${publicUrl} or edit it in the site builder.`,
          __action_card: {
            type: "landing_page_created",
            data: {
              site_id: site.id,
              name: siteName,
              slug,
              public_url: publicUrl,
              edit_url: editUrl,
              lead_type: leadType,
              city,
              agent_name: agentName,
            },
          },
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Landing page generation failed";
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Landing page generation failed: ${message}`,
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
