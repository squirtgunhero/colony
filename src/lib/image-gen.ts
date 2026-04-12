// ============================================
// DALL-E Image Generation
// Generates marketing images for ads and content
// ============================================

const OPENAI_API_BASE = "https://api.openai.com/v1";

export interface GenerateImageOptions {
  prompt: string;
  size?: "1024x1024" | "1792x1024" | "1024x1792";
  quality?: "standard" | "hd";
  style?: "natural" | "vivid";
}

export interface GeneratedImage {
  url: string;
  revised_prompt: string;
}

/**
 * Generate an image using DALL-E 3
 * Returns a temporary URL (valid for ~1 hour) — download/upload promptly
 */
export async function generateImage(
  options: GenerateImageOptions
): Promise<GeneratedImage> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch(`${OPENAI_API_BASE}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: options.prompt,
      n: 1,
      size: options.size || "1024x1024",
      quality: options.quality || "standard",
      style: options.style || "natural",
      response_format: "url",
    }),
    signal: AbortSignal.timeout(60_000), // 60s timeout — DALL-E can be slow
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error?.error?.message || `DALL-E API error: ${response.status}`
    );
  }

  const data = await response.json();
  return {
    url: data.data[0].url,
    revised_prompt: data.data[0].revised_prompt || options.prompt,
  };
}

/**
 * Build a real estate ad image prompt based on context.
 * By default generates a complete ad creative (photo + text overlay).
 * Set adCreative=false for raw property photos without text.
 */
export function buildAdImagePrompt(options: {
  type: string;
  city?: string;
  state?: string;
  businessType?: string;
  agentName?: string;
  headline?: string;
  ctaText?: string;
  leadType?: string;
  propertyDetails?: {
    address?: string;
    bedrooms?: number;
    bathrooms?: number;
    sqft?: number;
    price?: number;
  };
  customInstructions?: string;
  adCreative?: boolean; // true = include text overlay (default), false = photo only
}): string {
  const { type, city, state, businessType, propertyDetails, customInstructions } = options;
  const adCreative = options.adCreative !== false; // default true

  const location = [city, state].filter(Boolean).join(", ") || "suburban neighborhood";
  const agent = options.agentName || "";
  const leadType = options.leadType?.toLowerCase() || "seller";

  // Determine headline and CTA based on lead type and ad type
  const defaultHeadline = options.headline ||
    (leadType === "buyer"
      ? `Find Your Dream Home in ${city || "Your City"}`
      : `What's Your Home Worth?`);

  const defaultCta = options.ctaText ||
    (leadType === "buyer" ? "Search Homes Now" : "Get Free Estimate");

  if (adCreative) {
    // --- AD CREATIVE: realistic photo with bold text overlay ---
    const basePrompts: Record<string, string> = {
      new_listing: `Polished Facebook ad creative for a real estate listing in ${location}. Background: photorealistic exterior of a stunning home, golden hour light, lush landscaping. Overlay: bold white headline "${defaultHeadline}" in clean sans-serif font at the top, small agent branding "${agent}" in the corner, and a bright CTA button "${defaultCta}" at the bottom. Dark gradient overlay behind text for legibility. Professional ad layout, magazine quality.`,
      open_house: `Facebook ad creative for an open house in ${location}. Background: bright, beautifully staged modern living room with natural light. Overlay: bold headline "Open House This Weekend" in elegant white sans-serif, address and time in smaller text, agent name "${agent}", and a CTA button "${defaultCta}". Subtle dark gradient for readability. Clean, professional ad design.`,
      just_sold: `Facebook ad creative celebrating a just-sold property in ${location}. Background: gorgeous home exterior on a sunny day, professional photography. Overlay: bold "JUST SOLD" banner at top in gold/white, "${agent}" agent branding, and CTA "Thinking of Selling? ${defaultCta}" at bottom. Professional real estate marketing design.`,
      market_update: `Facebook ad creative for a real estate market update in ${location}. Background: aerial neighborhood view with tree-lined streets. Overlay: bold headline "${city || "Local"} Market Update" in white, key stat "Homes Selling Fast" in accent color, agent "${agent}" branding, CTA "${defaultCta}". Clean infographic-style ad layout.`,
      lead_generation: `Facebook ad creative for real estate lead generation in ${location}. Background: stunning modern home with dramatic sky, perfect landscaping, warm lights glowing from windows. Overlay: bold white headline "${defaultHeadline}" in premium sans-serif font, subtext "Free, No-Obligation Estimate", agent "${agent}" branding, and prominent CTA button "${defaultCta}". Dark cinematic gradient behind text. Looks like a $10,000 ad agency designed it.`,
      seller: `Facebook ad creative targeting home sellers in ${location}. Background: photorealistic beautiful home exterior, golden hour, luxury curb appeal. Bold white headline "${defaultHeadline}" overlaid at top with dark gradient for contrast. Subtext "Free, No-Obligation Home Valuation" in lighter weight. Agent name "${agent}" with subtle branding. Bright accent-colored CTA button "${defaultCta}" at bottom. Professional, premium ad design. Photorealistic background, clean typography.`,
      buyer: `Facebook ad creative targeting home buyers in ${location}. Background: photorealistic dream home with welcoming entrance, green lawn, blue sky. Bold white headline "${defaultHeadline}" overlaid at top with dark gradient. Subtext "Browse available homes in ${city || "your area"}" in lighter weight. Agent "${agent}" branding. Bright CTA button "${defaultCta}" at bottom. Professional real estate ad design. Photorealistic background, clean typography.`,
      general: `Facebook ad creative for a ${businessType || "real estate"} professional in ${location}. Background: photorealistic beautiful property, golden light. Bold headline "${defaultHeadline}" in white sans-serif with dark gradient overlay. Agent "${agent}" branding and CTA button "${defaultCta}". Professional, premium advertising design.`,
    };

    // Pick best template: use leadType if available, fall back to type
    let prompt = basePrompts[leadType] || basePrompts[type] || basePrompts.general;

    if (propertyDetails) {
      const details: string[] = [];
      if (propertyDetails.bedrooms) details.push(`${propertyDetails.bedrooms}-bedroom`);
      if (propertyDetails.sqft && propertyDetails.sqft > 3000) details.push("spacious luxury");
      if (details.length > 0) {
        prompt = prompt.replace("home", `${details.join(" ")} home`);
      }
    }

    if (customInstructions) {
      prompt += ` Additional style notes: ${customInstructions}`;
    }

    prompt += " The final image must look like a real, polished Facebook/Instagram ad ready to publish. Photorealistic background photo, clean modern typography, no spelling errors.";

    return prompt;
  } else {
    // --- RAW PHOTO: no text overlay ---
    const basePrompts: Record<string, string> = {
      new_listing: `Professional real estate marketing photo of a beautiful home exterior in ${location}. Warm golden hour lighting, manicured lawn, welcoming front entrance. Clean, aspirational, magazine-quality composition.`,
      open_house: `Inviting real estate open house scene: a bright, modern home interior in ${location} with natural light streaming through windows. Staged living room with contemporary furniture. Warm and welcoming atmosphere.`,
      just_sold: `Celebration-worthy exterior photo of a charming home in ${location}. Beautiful curb appeal, well-maintained property, sunny day. Professional real estate photography style.`,
      market_update: `Aerial view of a beautiful ${location} neighborhood with tree-lined streets, well-maintained homes, and green spaces. Professional drone photography style.`,
      lead_generation: `Professional real estate hero image: modern home in ${location} with stunning curb appeal. Dramatic sky, perfect landscaping, warm interior lights glowing. Aspirational lifestyle photography.`,
      general: `Professional real estate marketing image of a beautiful home in ${location}. Clean, bright, aspirational. Magazine-quality photography composition.`,
    };

    let prompt = basePrompts[type] || basePrompts.general;

    if (propertyDetails) {
      const details: string[] = [];
      if (propertyDetails.bedrooms) details.push(`${propertyDetails.bedrooms}-bedroom`);
      if (propertyDetails.sqft && propertyDetails.sqft > 3000) details.push("spacious luxury");
      if (details.length > 0) {
        prompt = prompt.replace("home", `${details.join(" ")} home`);
      }
    }

    if (customInstructions) {
      prompt += ` Additional style notes: ${customInstructions}`;
    }

    prompt += " Photorealistic. No text, words, letters, numbers, signs, logos, or watermarks anywhere in the image.";

    return prompt;
  }
}

/**
 * Download an image from URL and return as Buffer
 * Useful for uploading DALL-E images to Meta/UploadThing
 */
export async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download image: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
