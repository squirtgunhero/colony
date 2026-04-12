// ============================================================================
// AD IMAGE COMPOSITOR
// Generates polished ad creatives by compositing text overlays onto
// DALL-E background photos using sharp + SVG.
//
// DALL-E 3 cannot render text reliably — it garbles headlines, misspells
// city names, and mangles CTAs. Instead, we:
//   1. Generate a clean photorealistic background (no text) via DALL-E
//   2. Composite pixel-perfect text using SVG overlays via sharp
// ============================================================================

import sharp from "sharp";

export interface AdCompositeOptions {
  /** URL of the background image (from DALL-E or any source) */
  backgroundUrl: string;
  /** Main headline text — e.g. "What's Your Home Worth?" */
  headline: string;
  /** Subtext line — e.g. "Free, No-Obligation Estimate" */
  subtext?: string;
  /** CTA button text — e.g. "Get Free Estimate" */
  ctaText?: string;
  /** Agent name for branding */
  agentName?: string;
  /** Output dimensions (default: 1080x1080 for Facebook/Instagram) */
  width?: number;
  height?: number;
  /** Color scheme */
  accentColor?: string; // CTA button color (default: #c8a55a gold)
  headlineColor?: string; // Headline text color (default: white)
}

export interface CompositeResult {
  /** PNG buffer of the composited ad image */
  buffer: Buffer;
  /** MIME type */
  mimeType: "image/png";
  /** Width of output */
  width: number;
  /** Height of output */
  height: number;
}

/**
 * Download an image from a URL and return as a sharp-compatible buffer.
 */
async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Escape XML special characters for safe SVG embedding.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Word-wrap text to fit within a given pixel width.
 * Rough approximation: ~0.55 * fontSize per character for Inter/sans-serif.
 */
function wrapText(text: string, maxWidthPx: number, fontSize: number): string[] {
  const charWidth = fontSize * 0.52;
  const maxChars = Math.floor(maxWidthPx / charWidth);
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const test = currentLine ? `${currentLine} ${word}` : word;
    if (test.length > maxChars && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = test;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Build the SVG overlay for the ad creative.
 * Layout:
 *   - Dark gradient overlay (bottom 60% of image)
 *   - Headline (bold, large, white) — centered upper-middle
 *   - Subtext (lighter weight) — below headline
 *   - CTA button (rounded rect with accent color) — bottom
 *   - Agent name (small, subtle) — bottom corner
 */
function buildOverlaySvg(options: AdCompositeOptions): string {
  const w = options.width || 1080;
  const h = options.height || 1080;
  const accent = options.accentColor || "#c8a55a";
  const headlineColor = options.headlineColor || "#ffffff";

  // Font sizes scaled to output size
  const headlineFontSize = Math.round(w * 0.058); // ~63px at 1080
  const subtextFontSize = Math.round(w * 0.028); // ~30px at 1080
  const ctaFontSize = Math.round(w * 0.030); // ~32px at 1080
  const agentFontSize = Math.round(w * 0.020); // ~22px at 1080

  const padding = Math.round(w * 0.08);
  const textMaxWidth = w - padding * 2;

  // Wrap headline
  const headlineLines = wrapText(options.headline, textMaxWidth, headlineFontSize);

  // Calculate vertical positions (centered in bottom 60%)
  const contentStartY = h * 0.38;
  const headlineLineHeight = headlineFontSize * 1.15;
  const headlineBlockHeight = headlineLines.length * headlineLineHeight;

  // Headline Y - center it
  const headlineY = contentStartY + (h * 0.25 - headlineBlockHeight) / 2;

  // Subtext Y - below headline
  const subtextY = headlineY + headlineBlockHeight + subtextFontSize * 1.2;

  // CTA button - lower section
  const ctaY = h * 0.78;
  const ctaHeight = Math.round(ctaFontSize * 2.4);
  const ctaWidth = Math.round(
    Math.max(
      (options.ctaText || "").length * ctaFontSize * 0.55 + ctaFontSize * 2,
      w * 0.35
    )
  );
  const ctaX = (w - ctaWidth) / 2;

  // Agent name - bottom
  const agentY = h * 0.94;

  // Build SVG
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="overlay" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0)" />
      <stop offset="25%" stop-color="rgba(0,0,0,0.05)" />
      <stop offset="50%" stop-color="rgba(0,0,0,0.45)" />
      <stop offset="75%" stop-color="rgba(0,0,0,0.75)" />
      <stop offset="100%" stop-color="rgba(0,0,0,0.88)" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.5)" />
    </filter>
  </defs>

  <!-- Dark gradient overlay -->
  <rect x="0" y="0" width="${w}" height="${h}" fill="url(#overlay)" />

  <!-- Headline -->
  <text
    x="${w / 2}"
    y="${headlineY}"
    text-anchor="middle"
    font-family="Inter, Helvetica Neue, Arial, sans-serif"
    font-weight="700"
    font-size="${headlineFontSize}"
    fill="${headlineColor}"
    filter="url(#shadow)"
  >`;

  for (let i = 0; i < headlineLines.length; i++) {
    svg += `
    <tspan x="${w / 2}" dy="${i === 0 ? 0 : headlineLineHeight}">${escapeXml(headlineLines[i])}</tspan>`;
  }

  svg += `
  </text>`;

  // Subtext
  if (options.subtext) {
    svg += `
  <text
    x="${w / 2}"
    y="${subtextY}"
    text-anchor="middle"
    font-family="Inter, Helvetica Neue, Arial, sans-serif"
    font-weight="400"
    font-size="${subtextFontSize}"
    fill="rgba(255,255,255,0.85)"
    filter="url(#shadow)"
  >${escapeXml(options.subtext)}</text>`;
  }

  // CTA Button
  if (options.ctaText) {
    const ctaRadius = Math.round(ctaHeight / 2);
    svg += `
  <!-- CTA Button -->
  <rect
    x="${ctaX}" y="${ctaY}"
    width="${ctaWidth}" height="${ctaHeight}"
    rx="${ctaRadius}" ry="${ctaRadius}"
    fill="${accent}"
  />
  <text
    x="${w / 2}"
    y="${ctaY + ctaHeight / 2 + ctaFontSize * 0.35}"
    text-anchor="middle"
    font-family="Inter, Helvetica Neue, Arial, sans-serif"
    font-weight="600"
    font-size="${ctaFontSize}"
    fill="#000000"
  >${escapeXml(options.ctaText)}</text>`;
  }

  // Agent branding
  if (options.agentName) {
    svg += `
  <text
    x="${w / 2}"
    y="${agentY}"
    text-anchor="middle"
    font-family="Inter, Helvetica Neue, Arial, sans-serif"
    font-weight="400"
    font-size="${agentFontSize}"
    fill="rgba(255,255,255,0.6)"
  >${escapeXml(options.agentName)}</text>`;
  }

  svg += `
</svg>`;

  return svg;
}

/**
 * Composite a text overlay onto a background image.
 *
 * Flow:
 * 1. Fetch background image from URL
 * 2. Resize/crop to target dimensions
 * 3. Generate SVG overlay with headline, subtext, CTA, branding
 * 4. Composite SVG on top of background
 * 5. Return PNG buffer
 */
export async function composeAdImage(
  options: AdCompositeOptions
): Promise<CompositeResult> {
  const width = options.width || 1080;
  const height = options.height || 1080;

  // Step 1: Fetch and prepare background
  const bgBuffer = await fetchImageBuffer(options.backgroundUrl);

  const background = await sharp(bgBuffer)
    .resize(width, height, { fit: "cover", position: "center" })
    .png()
    .toBuffer();

  // Step 2: Build SVG overlay
  const overlaySvg = buildOverlaySvg(options);
  const overlayBuffer = Buffer.from(overlaySvg);

  // Step 3: Composite
  const result = await sharp(background)
    .composite([
      {
        input: overlayBuffer,
        top: 0,
        left: 0,
      },
    ])
    .png({ quality: 90 })
    .toBuffer();

  return {
    buffer: result,
    mimeType: "image/png",
    width,
    height,
  };
}
