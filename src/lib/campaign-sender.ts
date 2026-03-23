/**
 * Campaign Sender
 *
 * Executes email campaigns by sending to each recipient with optional
 * per-contact AI personalization via LLM.
 */

import { prisma } from "./prisma";
import { sendGmailEmail, getDefaultEmailAccount } from "./gmail";
import { fillTemplate } from "./email-templates";
import {
  findOrCreateThread,
  createOutboundMessageSystem,
} from "./db/inbox";
import { getDefaultProvider } from "@/lam/llm";
import * as Sentry from "@sentry/nextjs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CampaignSendResult {
  sent: number;
  failed: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function executeCampaign(
  campaignId: string,
  userId: string
): Promise<CampaignSendResult> {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
    include: {
      recipients: {
        where: { status: "pending" },
        include: {
          contact: { select: { id: true, name: true, email: true, type: true } },
        },
      },
    },
  });

  if (!campaign) throw new Error("Campaign not found");

  const emailAccount = await getDefaultEmailAccount(userId);
  if (!emailAccount) throw new Error("No email account connected");

  const personalize = (campaign.metadata as Record<string, unknown>)?.personalize === true;
  let sent = 0;
  let failed = 0;

  for (const recipient of campaign.recipients) {
    try {
      if (!recipient.contact.email) {
        await prisma.emailCampaignRecipient.update({
          where: { id: recipient.id },
          data: { status: "failed", errorMessage: "No email address" },
        });
        failed++;
        continue;
      }

      // Fill template variables
      const variables: Record<string, string> = {
        contactName: recipient.contact.name,
        firstName: recipient.contact.name.split(" ")[0],
      };

      let subject = fillTemplate(campaign.subject ?? "", variables);
      let body = fillTemplate(campaign.bodyHtml ?? campaign.bodyText ?? "", variables);

      // Optional AI personalization
      if (personalize) {
        body = await personalizeEmail(body, {
          name: recipient.contact.name,
          type: recipient.contact.type,
        });
      }

      // Send via Gmail
      const result = await sendGmailEmail({
        emailAccountId: emailAccount.id,
        to: recipient.contact.email,
        subject,
        body,
      });

      // Update recipient status
      await prisma.emailCampaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "sent", sentAt: new Date() },
      });

      // Log in unified inbox
      try {
        const { threadId } = await findOrCreateThread({
          channel: "email",
          address: recipient.contact.email,
          direction: "outbound",
          userId,
        });

        await createOutboundMessageSystem({
          threadId,
          channel: "email",
          toAddress: recipient.contact.email,
          fromAddress: emailAccount.email,
          userId,
          subject,
          bodyHtml: body,
          providerMessageId: result.messageId ?? undefined,
        });
      } catch {
        // Inbox logging is non-critical
      }

      // Create Activity + update lastContactedAt
      await prisma.activity.create({
        data: {
          userId,
          type: "email",
          title: `Campaign: ${subject}`,
          description: `Sent via "${campaign.name}" campaign`,
          contactId: recipient.contact.id,
        },
      });

      await prisma.contact.update({
        where: { id: recipient.contact.id },
        data: { lastContactedAt: new Date() },
      }).catch(() => {});

      sent++;

      // Rate limiting: 1 second between sends
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      failed++;
      await prisma.emailCampaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        },
      });
      Sentry.captureException(error, {
        tags: { component: "campaign-sender", campaignId },
      });
    }
  }

  // Update campaign stats
  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      status: "completed",
      sentAt: new Date(),
      recipientCount: sent + failed,
    },
  });

  return { sent, failed, total: sent + failed };
}

// ---------------------------------------------------------------------------
// AI Personalization
// ---------------------------------------------------------------------------

async function personalizeEmail(
  body: string,
  contact: { name: string; type: string }
): Promise<string> {
  try {
    const llm = getDefaultProvider();
    const response = await llm.complete(
      [
        {
          role: "system",
          content:
            "You are an email personalization assistant. Rewrite the following email template to feel personal and 1-to-1, tailored to the recipient. Keep the same core message and length. Return only the rewritten HTML body, no explanation.",
        },
        {
          role: "user",
          content: `Recipient: ${contact.name} (${contact.type})\n\nEmail body:\n${body}`,
        },
      ],
      { temperature: 0.7, maxTokens: 1000 },
    );

    return response.content || body;
  } catch {
    // Fallback to unpersonalized version
    return body;
  }
}
