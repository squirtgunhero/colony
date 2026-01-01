import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { getCampaigns, createCampaign } from "@/lib/db/honeycomb";
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

    const campaign = await createCampaign({
      name: body.name.trim(),
      description: body.description?.trim(),
      objective: body.objective,
      budget: body.budget ? parseFloat(body.budget) : undefined,
      dailyBudget: body.dailyBudget ? parseFloat(body.dailyBudget) : undefined,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    });

    return NextResponse.json({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
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
