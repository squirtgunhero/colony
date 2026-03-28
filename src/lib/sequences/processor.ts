// ============================================================================
// COLONY - Email Sequence Processor
// Sends scheduled sequence emails via Gmail and advances enrollments
// ============================================================================

import { prisma } from "@/lib/prisma";
import { sendGmailEmail, getDefaultEmailAccount } from "@/lib/gmail";
import { fillTemplate } from "@/lib/email-templates";
import {
  findOrCreateThread,
  createOutboundMessageSystem,
} from "@/lib/db/inbox";

interface SequenceStep {
  stepNumber: number;
  subject: string;
  bodyTemplate: string;
  delayDays: number;
  sendTime?: string; // HH:MM format
}

/**
 * Process all due sequence enrollments.
 * Called by the cron endpoint every 15 minutes.
 */
export async function processSequences(): Promise<{
  sent: number;
  failed: number;
  completed: number;
}> {
  const now = new Date();

  // Find enrollments ready to send
  const dueEnrollments = await prisma.sequenceEnrollment.findMany({
    where: {
      status: "active",
      nextSendAt: { lte: now },
    },
    include: {
      contact: true,
      sequence: true,
    },
    take: 50, // Process in batches
  });

  let sent = 0;
  let failed = 0;
  let completed = 0;

  for (const enrollment of dueEnrollments) {
    try {
      const steps = enrollment.sequence.steps as unknown as SequenceStep[];
      const currentStep = steps.find(
        (s) => s.stepNumber === enrollment.currentStep
      );

      if (!currentStep) {
        // No more steps — mark completed
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: "completed", nextSendAt: null },
        });
        completed++;
        continue;
      }

      // Contact must have an email
      if (!enrollment.contact.email) {
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: "bounced", nextSendAt: null },
        });
        await prisma.sequenceEvent.create({
          data: {
            enrollmentId: enrollment.id,
            step: enrollment.currentStep,
            type: "bounced",
            metadata: { reason: "No email address" },
          },
        });
        failed++;
        continue;
      }

      // Get the sender's email account
      const emailAccount = await getDefaultEmailAccount(
        enrollment.sequence.userId
      );
      if (!emailAccount) {
        failed++;
        continue;
      }

      // Render template with contact data
      const contactName = enrollment.contact.name;
      const variables: Record<string, string> = {
        contactName,
        firstName: contactName.split(" ")[0],
        lastName: contactName.split(" ").slice(1).join(" ") || "",
        email: enrollment.contact.email,
        company: enrollment.contact.companyName || "",
        jobTitle: enrollment.contact.jobTitle || "",
      };

      const subject = fillTemplate(currentStep.subject, variables);
      const body = fillTemplate(currentStep.bodyTemplate, variables);

      // Send via Gmail
      const result = await sendGmailEmail({
        emailAccountId: emailAccount.id,
        to: enrollment.contact.email,
        subject,
        body,
      });

      // Create sequence event
      await prisma.sequenceEvent.create({
        data: {
          enrollmentId: enrollment.id,
          step: enrollment.currentStep,
          type: "sent",
          metadata: {
            messageId: result.messageId,
            threadId: result.threadId,
            subject,
          },
        },
      });

      // Log in unified inbox
      try {
        const { threadId } = await findOrCreateThread({
          channel: "email",
          address: enrollment.contact.email,
          direction: "outbound",
          userId: enrollment.sequence.userId,
        });

        await createOutboundMessageSystem({
          threadId,
          channel: "email",
          toAddress: enrollment.contact.email,
          fromAddress: emailAccount.email,
          userId: enrollment.sequence.userId,
          subject,
          bodyHtml: body,
          providerMessageId: result.messageId ?? undefined,
        });
      } catch {
        // Inbox logging is non-critical
      }

      // Create activity
      await prisma.activity.create({
        data: {
          userId: enrollment.sequence.userId,
          type: "email",
          title: `Sequence: ${subject}`,
          description: `Step ${enrollment.currentStep} of "${enrollment.sequence.name}"`,
          contactId: enrollment.contactId,
        },
      });

      // Update lastContactedAt
      await prisma.contact
        .update({
          where: { id: enrollment.contactId },
          data: { lastContactedAt: new Date() },
        })
        .catch(() => {});

      // Advance to next step
      const nextStepNumber = enrollment.currentStep + 1;
      const nextStep = steps.find((s) => s.stepNumber === nextStepNumber);

      if (nextStep) {
        const nextSendAt = calculateNextSendAt(nextStep.delayDays, nextStep.sendTime);
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: {
            currentStep: nextStepNumber,
            nextSendAt,
          },
        });
      } else {
        // Last step — mark completed
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: "completed", nextSendAt: null },
        });
        completed++;
      }

      sent++;

      // Rate limiting: 1s between sends
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(
        `[Sequences] Failed to process enrollment ${enrollment.id}:`,
        error
      );
      failed++;
    }
  }

  return { sent, failed, completed };
}

/**
 * Enroll a contact in a sequence.
 * Sets the first step's nextSendAt based on delay.
 */
export async function enrollContact(
  sequenceId: string,
  contactId: string
): Promise<{ id: string }> {
  const sequence = await prisma.emailSequence.findUniqueOrThrow({
    where: { id: sequenceId },
  });

  const steps = sequence.steps as unknown as SequenceStep[];
  const firstStep = steps.find((s) => s.stepNumber === 1);

  if (!firstStep) {
    throw new Error("Sequence has no steps");
  }

  const nextSendAt = calculateNextSendAt(
    firstStep.delayDays,
    firstStep.sendTime
  );

  return prisma.sequenceEnrollment.create({
    data: {
      sequenceId,
      contactId,
      currentStep: 1,
      status: "active",
      nextSendAt,
    },
  });
}

/**
 * Calculate when the next email should be sent.
 */
function calculateNextSendAt(delayDays: number, sendTime?: string): Date {
  const sendAt = new Date();
  sendAt.setDate(sendAt.getDate() + delayDays);

  if (sendTime) {
    const [hours, minutes] = sendTime.split(":").map(Number);
    sendAt.setHours(hours, minutes, 0, 0);
  }

  return sendAt;
}
