// ============================================================================
// POST /api/marketing/image — Generate marketing images with DALL-E
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { prisma } from "@/lib/prisma";
import { generateImage, buildAdImagePrompt } from "@/lib/image-gen";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const { type, propertyId, customPrompt, size, style } = body;

    // Get user profile for location context
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { businessType: true, serviceAreaCity: true },
    });

    // Get property details if specified
    let propertyDetails: {
      address?: string;
      bedrooms?: number;
      bathrooms?: number;
      sqft?: number;
      price?: number;
    } | undefined;

    if (propertyId) {
      const property = await prisma.property.findFirst({
        where: { id: propertyId, userId },
      });
      if (property) {
        propertyDetails = {
          address: property.address || undefined,
          bedrooms: property.bedrooms || undefined,
          bathrooms: property.bathrooms ? Number(property.bathrooms) : undefined,
          sqft: property.sqft || undefined,
          price: property.price ? Number(property.price) : undefined,
        };
      }
    }

    // Build the prompt
    const prompt = customPrompt || buildAdImagePrompt({
      type: type || "general",
      city: profile?.serviceAreaCity || undefined,
      businessType: profile?.businessType || undefined,
      propertyDetails,
    });

    // Generate the image
    const result = await generateImage({
      prompt,
      size: size || "1024x1024",
      style: style || "natural",
    });

    return NextResponse.json({
      image_url: result.url,
      revised_prompt: result.revised_prompt,
    });
  } catch (error) {
    console.error("Image generation error:", error);
    const message = error instanceof Error ? error.message : "Image generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
