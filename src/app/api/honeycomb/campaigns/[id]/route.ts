import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { getCampaignById } from "@/lib/db/honeycomb";

/**
 * GET /api/honeycomb/campaigns/:id
 * Returns a single campaign by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const campaign = await getCampaignById(id);

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      status: campaign.status,
      objective: campaign.objective,
      budget: campaign.budget,
      dailyBudget: campaign.dailyBudget,
      startDate: campaign.startDate?.toISOString(),
      endDate: campaign.endDate?.toISOString(),
      impressions: campaign.impressions,
      clicks: campaign.clicks,
      conversions: campaign.conversions,
      spend: campaign.spend,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
      creatives: campaign.creatives,
      segments: campaign.segments,
    });
  } catch (error) {
    console.error("Failed to get honeycomb campaign:", error);
    return NextResponse.json(
      { error: "Failed to get campaign" },
      { status: 500 }
    );
  }
}

