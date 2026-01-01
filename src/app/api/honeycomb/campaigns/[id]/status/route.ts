import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { updateCampaignStatus, type CampaignStatus } from "@/lib/db/honeycomb";

const VALID_STATUSES: CampaignStatus[] = ["draft", "active", "paused", "completed", "archived"];

/**
 * POST /api/honeycomb/campaigns/:id/status
 * Update campaign status
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const campaign = await updateCampaignStatus(id, body.status);

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      updatedAt: campaign.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Failed to update campaign status:", error);
    return NextResponse.json(
      { error: "Failed to update campaign status" },
      { status: 500 }
    );
  }
}

