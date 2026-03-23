/**
 * Workflow Automation Engine
 *
 * Evaluates if/then automation rules when events fire.
 * Trigger types: deal_stage_changed, email_opened, email_clicked,
 *   new_lead_created, contact_dormant, task_overdue
 * Action types: send_email, create_task, update_deal_stage, send_sms, add_tag
 */

import { prisma } from "./prisma";
import { sendGmailEmail, getDefaultEmailAccount } from "./gmail";
import { sendSMS } from "./twilio";
import { fillTemplate } from "./email-templates";
import * as Sentry from "@sentry/nextjs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AutomationEvent {
  type:
    | "deal_stage_changed"
    | "email_opened"
    | "email_clicked"
    | "new_lead_created"
    | "contact_dormant"
    | "task_overdue";
  userId: string;
  contactId?: string;
  dealId?: string;
  metadata: Record<string, unknown>;
  isAutomation?: boolean; // Guard against infinite loops
}

interface AutomationTrigger {
  type: string;
  conditions?: Record<string, unknown>;
}

interface AutomationAction {
  type: "send_email" | "create_task" | "update_deal_stage" | "send_sms" | "add_tag";
  params: Record<string, string | number | boolean>;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function evaluateAutomations(event: AutomationEvent): Promise<void> {
  // Guard against infinite loops
  if (event.isAutomation) return;

  try {
    const automations = await prisma.automation.findMany({
      where: { userId: event.userId, isActive: true },
    });

    for (const automation of automations) {
      try {
        const trigger = automation.trigger as unknown as AutomationTrigger;
        if (trigger.type !== event.type) continue;
        if (!matchesConditions(trigger.conditions, event.metadata)) continue;

        const action = automation.action as unknown as AutomationAction;
        await executeAction(action, event);

        // Update automation stats
        await prisma.automation.update({
          where: { id: automation.id },
          data: {
            lastFiredAt: new Date(),
            fireCount: { increment: 1 },
          },
        });

        // Log activity
        await prisma.activity.create({
          data: {
            userId: event.userId,
            type: "automation",
            title: `Automation fired: ${automation.name}`,
            description: `Trigger: ${trigger.type} → Action: ${action.type}`,
            contactId: event.contactId,
            dealId: event.dealId,
          },
        });
      } catch (error) {
        Sentry.captureException(error, {
          tags: { component: "automation-engine", automationId: automation.id },
        });
      }
    }
  } catch (error) {
    Sentry.captureException(error, {
      tags: { component: "automation-engine" },
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchesConditions(
  conditions: Record<string, unknown> | undefined,
  metadata: Record<string, unknown>
): boolean {
  if (!conditions) return true;
  return Object.entries(conditions).every(
    ([key, value]) => metadata[key] === value
  );
}

async function executeAction(
  action: AutomationAction,
  event: AutomationEvent
): Promise<void> {
  switch (action.type) {
    case "send_email": {
      if (!event.contactId) return;
      const contact = await prisma.contact.findUnique({
        where: { id: event.contactId },
        select: { email: true, name: true },
      });
      if (!contact?.email) return;

      const emailAccount = await getDefaultEmailAccount(event.userId);
      if (!emailAccount) return;

      const variables: Record<string, string> = {
        contactName: contact.name,
        firstName: contact.name.split(" ")[0],
      };

      await sendGmailEmail({
        emailAccountId: emailAccount.id,
        to: contact.email,
        subject: fillTemplate(String(action.params.subject ?? ""), variables),
        body: fillTemplate(String(action.params.body ?? ""), variables),
      });
      break;
    }

    case "create_task": {
      await prisma.task.create({
        data: {
          userId: event.userId,
          title: String(action.params.title ?? "Follow up"),
          completed: false,
          dueDate: action.params.dueInDays
            ? new Date(Date.now() + Number(action.params.dueInDays) * 86400000)
            : undefined,
          contactId: event.contactId,
          dealId: event.dealId,
        },
      });
      break;
    }

    case "update_deal_stage": {
      if (!event.dealId) return;
      await prisma.deal.update({
        where: { id: event.dealId },
        data: { stage: String(action.params.newStage) },
      });
      break;
    }

    case "send_sms": {
      if (!event.contactId) return;
      const smsContact = await prisma.contact.findUnique({
        where: { id: event.contactId },
        select: { phone: true, name: true },
      });
      if (!smsContact?.phone) return;

      const smsVars: Record<string, string> = {
        contactName: smsContact.name,
        firstName: smsContact.name.split(" ")[0],
      };

      await sendSMS(
        smsContact.phone,
        fillTemplate(String(action.params.message ?? ""), smsVars)
      );
      break;
    }

    case "add_tag": {
      if (!event.contactId) return;
      const tagContact = await prisma.contact.findUnique({
        where: { id: event.contactId },
        select: { tags: true },
      });
      if (!tagContact) return;

      const tag = String(action.params.tag);
      const currentTags = (tagContact.tags as string[]) ?? [];
      if (!currentTags.includes(tag)) {
        await prisma.contact.update({
          where: { id: event.contactId },
          data: { tags: [...currentTags, tag] },
        });
      }
      break;
    }
  }
}
