import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { getCampaigns, createCampaign } from "@/lib/db/honeycomb";
import { prisma } from "@/lib/prisma";
import type { CampaignsResponse } from "@/lib/honeycomb/types";

/**
 * GET /api/honeycomb/campaigns
 * Returns list of campaigns for the current user
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaigns = await getCampaigns();
    
    const response: CampaignsResponse = {
      campaigns: campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        channel: c.channel,
        impressions: c.impressions,
        clicks: c.clicks,
        conversions: c.conversions,
        spend: c.spend,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to get honeycomb campaigns:", error);
    return NextResponse.json(
      { error: "Failed to get campaigns" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/honeycomb/campaigns
 * Create a new campaign
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
      return NextResponse.json(
        { error: "Campaign name is required" },
        { status: 400 }
      );
    }

    const channel = body.channel || "native";
    const validChannels = ["meta", "native", "llm", "google", "bing", "local"];
    if (!validChannels.includes(channel)) {
      return NextResponse.json(
        { error: "Invalid channel. Use: meta, native, llm, google, bing, local" },
        { status: 400 }
      );
    }

    const status = (channel === "google" || channel === "bing") ? "draft" : undefined;

    const campaign = await createCampaign({
      name: body.name.trim(),
      description: body.description?.trim(),
      objective: body.objective,
      budget: body.budget ? parseFloat(body.budget) : undefined,
      dailyBudget: body.dailyBudget ? parseFloat(body.dailyBudget) : undefined,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      channel,
      ...(status ? { status } : {}),
    });

    if (channel === "llm") {
      const profile = await prisma.profile.findUnique({ where: { id: user.id } });
      await prisma.llmListing.create({
        data: {
          campaignId: campaign.id,
          userId: user.id,
          businessName: body.businessName || profile?.fullName || "Business",
          category: body.category || profile?.businessType || "other",
          description: body.description || "",
          serviceArea: body.serviceArea || "",
          phone: body.phone,
          website: body.website,
        },
      });
    }

    return NextResponse.json({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      channel: campaign.channel,
      impressions: campaign.impressions,
      clicks: campaign.clicks,
      conversions: campaign.conversions,
      spend: campaign.spend,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create honeycomb campaign:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}
