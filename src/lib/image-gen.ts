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
 * Build a real estate ad background image prompt.
 *
 * IMPORTANT: This now ALWAYS generates clean photos WITHOUT text.
 * DALL-E 3 cannot render text reliably — it garbles headlines, misspells
 * city names, and mangles CTAs. All text overlay is handled separately
 * by the ad-compositor (sharp + SVG) for pixel-perfect typography.
 */
export function buildAdImagePrompt(options: {
  type: string;
  city?: string;
  state?: string;
  businessType?: string;
  agentName?: string;
  leadType?: string;
  propertyDetails?: {
    address?: string;
    bedrooms?: number;
    bathrooms?: number;
    sqft?: number;
    price?: number;
  };
  customInstructions?: string;
}): string {
  const { type, city, state, propertyDetails, customInstructions } = options;
  const location = [city, state].filter(Boolean).join(", ") || "suburban neighborhood";
  const leadType = options.leadType?.toLowerCase() || "seller";

  const basePrompts: Record<string, string> = {
    new_listing: `Professional real estate marketing photo of a beautiful home exterior in ${location}. Warm golden hour lighting, manicured lawn, welcoming front entrance. Clean, aspirational, magazine-quality composition.`,
    open_house: `Inviting real estate open house scene: a bright, modern home interior in ${location} with natural light streaming through windows. Staged living room with contemporary furniture. Warm and welcoming atmosphere.`,
    just_sold: `Celebration-worthy exterior photo of a charming home in ${location}. Beautiful curb appeal, well-maintained property, sunny day. Professional real estate photography style.`,
    market_update: `Aerial view of a beautiful ${location} neighborhood with tree-lined streets, well-maintained homes, and green spaces. Professional drone photography style.`,
    lead_generation: `Professional real estate hero image: stunning modern home in ${location} with dramatic golden hour sky, perfect landscaping, warm interior lights glowing through large windows. Aspirational luxury lifestyle photography. Shot from a low angle to make the home feel grand.`,
    seller: `Photorealistic exterior of a beautiful upscale home in ${location}. Golden hour lighting, perfect curb appeal, lush green lawn, warm welcoming glow from windows. Magazine-quality real estate photography, shallow depth of field.`,
    buyer: `Photorealistic dream home with welcoming entrance in ${location}. Beautiful front yard, blue sky with soft clouds, green lawn, inviting porch. Warm, aspirational real estate photography.`,
    general: `Professional real estate marketing image of a beautiful home in ${location}. Clean, bright, aspirational. Magazine-quality photography composition.`,
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

  // CRITICAL: No text in the image — the compositor handles all text overlay
  prompt += " Photorealistic. No text, words, letters, numbers, signs, logos, or watermarks anywhere in the image. Clean background photo only.";

  return prompt;
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
