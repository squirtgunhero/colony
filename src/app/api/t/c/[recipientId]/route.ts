/**
 * Email Click Tracking
 * GET /api/t/c/[recipientId]?url=... — records click, 302 redirects
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateAutomations } from "@/lib/automation-engine";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ recipientId: string }> }
) {
  const { recipientId } = await params;
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return new Response("Missing url parameter", { status: 400 });
  }

  // Validate URL
  try {
    new URL(url);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }

  try {
    const recipient = await prisma.emailCampaignRecipient.findUnique({
      where: { id: recipientId },
      select: {
        id: true,
        clickedAt: true,
        campaignId: true,
        contactId: true,
        campaign: { select: { userId: true } },
      },
    });

    if (recipient) {
      await prisma.emailCampaignRecipient.update({
        where: { id: recipientId },
        data: {
          ...(recipient.clickedAt ? {} : { clickedAt: new Date() }),
          status: "clicked",
        },
      });

      await prisma.emailCampaign.update({
        where: { id: recipient.campaignId },
        data: { clickCount: { increment: 1 } },
      });

      evaluateAutomations({
        type: "email_clicked",
        userId: recipient.campaign.userId,
        contactId: recipient.contactId,
        metadata: { campaignId: recipient.campaignId, recipientId, url },
      }).catch(() => {});
    }
  } catch {
    // Fail silently — always redirect
  }

  return Response.redirect(url, 302);
}
