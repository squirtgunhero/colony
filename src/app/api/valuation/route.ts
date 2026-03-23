import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/valuation
 * Public endpoint — creates a new Contact (lead) from a home valuation request.
 * Accepts an optional `?agent=USER_ID` query param to assign the lead to a specific agent.
 * Tracks UTM parameters for campaign attribution.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, city, state, zip, name, email, phone } = body;

    if (!name || !email || !address || !city || !state || !zip) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, address, city, state, and zip are required." },
        { status: 400 }
      );
    }

    const params = request.nextUrl.searchParams;
    const agentId = params.get("agent") || undefined;

    // Extract UTM parameters for attribution tracking
    const utmSource = body.utm_source || params.get("utm_source") || undefined;
    const utmMedium = body.utm_medium || params.get("utm_medium") || undefined;
    const utmCampaign = body.utm_campaign || params.get("utm_campaign") || undefined;
    const utmContent = body.utm_content || params.get("utm_content") || undefined;
    const utmTerm = body.utm_term || params.get("utm_term") || undefined;
    const landingPage = body.landing_page || params.get("landing_page") || undefined;
    const referrer = body.referrer || undefined;

    // Determine campaign channel from UTM source
    let campaignChannel: string | undefined;
    if (utmSource) {
      const src = utmSource.toLowerCase();
      if (src.includes("facebook") || src.includes("instagram") || src.includes("meta")) {
        campaignChannel = "meta";
      } else if (src.includes("google")) {
        campaignChannel = "google";
      } else if (src.includes("colony") || src.includes("honeycomb")) {
        campaignChannel = "native";
      } else {
        campaignChannel = utmSource;
      }
    }

    const fullAddress = `${address}, ${city}, ${state} ${zip}`;

    const contact = await prisma.contact.create({
      data: {
        name,
        email,
        phone: phone || undefined,
        source: "valuation_landing_page",
        type: "lead",
        userId: agentId,
        tags: ["valuation_request"],
        notes: `Home valuation request for: ${fullAddress}`,
        // Attribution
        campaignChannel,
        campaignName: utmCampaign || undefined,
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,
        landingPage,
      },
    });

    // Create attribution record if we have campaign data
    if (utmSource || campaignChannel) {
      try {
        await prisma.leadAttribution.create({
          data: {
            contactId: contact.id,
            channel: campaignChannel || utmSource || "valuation_landing_page",
            campaignName: utmCampaign || undefined,
            utmSource,
            utmMedium,
            utmCampaign,
            utmContent,
            utmTerm,
            landingPage,
            referrer,
            touchType: "first",
          },
        });
      } catch (e) {
        console.error("[valuation] Failed to create lead attribution:", e);
      }
    }

    return NextResponse.json({ success: true, contactId: contact.id }, { status: 201 });
  } catch (error) {
    console.error("[valuation] Error creating lead:", error);
    return NextResponse.json(
      { error: "Failed to submit valuation request. Please try again." },
      { status: 500 }
    );
  }
}
