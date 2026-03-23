/**
 * Drip Campaign Cron
 *
 * Runs hourly. For each active drip campaign, checks if any recipient's
 * next step is due (based on delayDays since last step), and sends it.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendGmailEmail, getDefaultEmailAccount } from "@/lib/gmail";
import { fillTemplate } from "@/lib/email-templates";
import { injectTrackingPixel, rewriteLinks } from "@/lib/campaign-sender";
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  return Sentry.withMonitor("drip-campaigns", async () => {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    const campaigns = await prisma.emailCampaign.findMany({
      where: { type: "drip", status: "active" },
      include: {
        steps: { orderBy: { stepOrder: "asc" } },
        recipients: {
          where: { status: { in: ["sent", "opened", "clicked"] } },
          include: {
            contact: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    let sent = 0;
    let errors = 0;

    for (const campaign of campaigns) {
      if (campaign.steps.length === 0) continue;

      const emailAccount = await getDefaultEmailAccount(campaign.userId);
      if (!emailAccount) continue;

      for (const recipient of campaign.recipients) {
        try {
          const nextStepIndex = recipient.currentStep + 1;
          const nextStep = campaign.steps.find(
            (s) => s.stepOrder === nextStepIndex
          );

          if (!nextStep) continue; // All steps completed
          if (!recipient.contact.email) continue;

          // Check delay
          const referenceDate =
            recipient.lastStepSentAt ?? recipient.sentAt;
          if (!referenceDate) continue;

          const daysSince =
            (Date.now() - referenceDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince < nextStep.delayDays) continue;

          // Fill template
          const variables: Record<string, string> = {
            contactName: recipient.contact.name,
            firstName: recipient.contact.name.split(" ")[0],
          };
          const subject = fillTemplate(nextStep.subject, variables);
          let body = fillTemplate(
            nextStep.bodyHtml ?? nextStep.bodyText ?? "",
            variables
          );

          // Inject tracking
          body = rewriteLinks(body, recipient.id);
          body = injectTrackingPixel(body, recipient.id);

          // Send
          await sendGmailEmail({
            emailAccountId: emailAccount.id,
            to: recipient.contact.email,
            subject,
            body,
          });

          // Update recipient
          await prisma.emailCampaignRecipient.update({
            where: { id: recipient.id },
            data: {
              currentStep: nextStepIndex,
              lastStepSentAt: new Date(),
            },
          });

          // Activity
          await prisma.activity.create({
            data: {
              userId: campaign.userId,
              type: "email",
              title: `Drip step ${nextStepIndex}: ${subject}`,
              description: `Sent via "${campaign.name}" drip campaign`,
              contactId: recipient.contact.id,
            },
          });

          await prisma.contact
            .update({
              where: { id: recipient.contact.id },
              data: { lastContactedAt: new Date() },
            })
            .catch(() => {});

          sent++;
          await new Promise((r) => setTimeout(r, 1000));
        } catch (error) {
          errors++;
          Sentry.captureException(error, {
            tags: {
              component: "cron",
              route: "/api/cron/drip-campaigns",
              campaignId: campaign.id,
            },
          });
        }
      }

      // Auto-complete if all recipients finished all steps
      const totalSteps = campaign.steps.length;
      const allDone =
        campaign.recipients.length > 0 &&
        campaign.recipients.every((r) => r.currentStep >= totalSteps);
      if (allDone) {
        await prisma.emailCampaign.update({
          where: { id: campaign.id },
          data: { status: "completed" },
        });
      }
    }

    return Response.json({ sent, errors, campaigns: campaigns.length });
  });
}
