import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { executeCampaign } from "@/lib/campaign-sender";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: campaignId } = await params;

  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign || campaign.userId !== user.id) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (!["draft", "scheduled"].includes(campaign.status)) {
    return NextResponse.json(
      { error: `Campaign is ${campaign.status}, cannot send` },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { contactIds, personalize } = body as {
    contactIds: string[];
    personalize?: boolean;
  };

  if (!contactIds || contactIds.length === 0) {
    return NextResponse.json(
      { error: "contactIds required" },
      { status: 400 }
    );
  }

  // Create recipient rows
  const recipientData = contactIds.map((contactId: string) => ({
    campaignId,
    contactId,
    status: "pending",
  }));

  await prisma.emailCampaignRecipient.createMany({
    data: recipientData,
    skipDuplicates: true,
  });

  // Store personalize flag in campaign metadata
  if (personalize) {
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: "active",
        metadata: { ...(campaign.metadata as object ?? {}), personalize: true },
      },
    });
  } else {
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: "active" },
    });
  }

  // Execute campaign
  const result = await executeCampaign(campaignId, user.id);

  return NextResponse.json({
    success: true,
    sent: result.sent,
    failed: result.failed,
    total: result.total,
  });
}
