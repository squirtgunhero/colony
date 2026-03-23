/**
 * Email Open Tracking Pixel
 * GET /api/t/o/[recipientId] — returns 1x1 transparent GIF
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateAutomations } from "@/lib/automation-engine";

export const dynamic = "force-dynamic";

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

const HEADERS = {
  "Content-Type": "image/gif",
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ recipientId: string }> }
) {
  const { recipientId } = await params;

  try {
    const recipient = await prisma.emailCampaignRecipient.findUnique({
      where: { id: recipientId },
      select: {
        id: true,
        status: true,
        openedAt: true,
        campaignId: true,
        contactId: true,
        campaign: { select: { userId: true } },
      },
    });

    if (recipient) {
      // Update recipient (first open only)
      await prisma.emailCampaignRecipient.update({
        where: { id: recipientId },
        data: {
          ...(recipient.openedAt ? {} : { openedAt: new Date() }),
          ...(recipient.status === "sent" ? { status: "opened" } : {}),
        },
      });

      // Increment campaign open count
      await prisma.emailCampaign.update({
        where: { id: recipient.campaignId },
        data: { openCount: { increment: 1 } },
      });

      // Fire automation
      evaluateAutomations({
        type: "email_opened",
        userId: recipient.campaign.userId,
        contactId: recipient.contactId,
        metadata: { campaignId: recipient.campaignId, recipientId },
      }).catch(() => {});
    }
  } catch {
    // Fail silently — tracking should never break email experience
  }

  return new Response(PIXEL, { status: 200, headers: HEADERS });
}
