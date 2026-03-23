// Communications Domain Executors — Email, SMS, Campaigns, Drafting
import { prisma } from "@/lib/prisma";
import { sendSMS } from "@/lib/twilio";
import { sendGmailEmail } from "@/lib/gmail";
import { executeCampaign } from "@/lib/campaign-sender";
import { draftContextualEmail } from "@/lib/contextual-email";
import type { ActionExecutor } from "../types";

export const commsExecutors: Record<string, ActionExecutor> = {
  "email.send": async (action, ctx) => {
    if (action.type !== "email.send") throw new Error("Invalid action type");

    const { contactId, subject, body, to: directEmail } = action.payload as {
      contactId?: string;
      subject: string;
      body: string;
      to?: string;
    };

    let recipientEmail = directEmail;
    let recipientName = directEmail ?? "recipient";
    let resolvedContactId = contactId;

    if (contactId) {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
      });

      if (!contact) {
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "failed" as const,
          error: "Contact not found",
        };
      }

      if (contact.userId !== ctx.user_id) {
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "failed" as const,
          error: "Contact belongs to a different user",
        };
      }

      if (!contact.email) {
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "failed" as const,
          error: `${contact.name} doesn't have an email on file`,
        };
      }

      recipientEmail = contact.email;
      recipientName = contact.name;
      resolvedContactId = contact.id;
    }

    if (!recipientEmail) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "No email address provided and no contactId to look up",
      };
    }

    const emailAccount = await prisma.emailAccount.findFirst({
      where: { userId: ctx.user_id, isDefault: true },
    });

    if (!emailAccount) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error:
          "You haven't connected an email account yet. Go to Settings to connect Gmail.",
      };
    }

    const result = await sendGmailEmail({
      emailAccountId: emailAccount.id,
      to: recipientEmail,
      subject,
      body,
    });

    await prisma.activity.create({
      data: {
        userId: ctx.user_id,
        type: "email",
        title: `Email sent to ${recipientName}`,
        description: subject,
        metadata: JSON.stringify({
          messageId: result.messageId,
          threadId: result.threadId,
          to: recipientEmail,
          subject,
        }),
        contactId: resolvedContactId,
      },
    });

    // Keep lastContactedAt fresh
    if (resolvedContactId) {
      await prisma.contact.update({
        where: { id: resolvedContactId },
        data: { lastContactedAt: new Date() },
      }).catch(() => {});
    }

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success" as const,
      data: {
        messageId: result.messageId,
        threadId: result.threadId,
        to: recipientEmail,
        recipientName,
        message: `Email sent to ${recipientName}`,
      },
    };
  },

  "sms.send": async (action, ctx) => {
    if (action.type !== "sms.send") throw new Error("Invalid action type");

    const { contactId, phoneNumber, message } = action.payload as {
      contactId?: string;
      phoneNumber?: string;
      message: string;
    };

    let to = phoneNumber;
    let recipientName = phoneNumber ?? "unknown";

    if (contactId) {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
      });

      if (!contact) {
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "failed" as const,
          error: "Contact not found",
        };
      }

      if (contact.userId !== ctx.user_id) {
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "failed" as const,
          error: "Contact belongs to a different user",
        };
      }

      if (!contact.phone) {
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "failed" as const,
          error: `${contact.name} doesn't have a phone number on file`,
        };
      }

      to = contact.phone;
      recipientName = contact.name;
    }

    if (!to) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "No phone number provided and no contactId to look up",
      };
    }

    const result = await sendSMS(to, message);

    await prisma.sMSMessage.create({
      data: {
        profileId: ctx.user_id,
        direction: "outbound",
        from: process.env.TWILIO_PHONE_NUMBER!,
        to,
        body: message,
        twilioSid: result.sid,
        status: "sent",
        lamRunId: ctx.run_id,
      },
    });

    // Keep lastContactedAt fresh
    if (contactId) {
      await prisma.contact.update({
        where: { id: contactId },
        data: { lastContactedAt: new Date() },
      }).catch(() => {});
    }

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success" as const,
      data: {
        sid: result.sid,
        to,
        recipientName,
        message: `SMS sent to ${recipientName}`,
      },
    };
  },

  "email.send_campaign": async (action, ctx) => {
    if (action.type !== "email.send_campaign") throw new Error("Invalid action type");

    const { campaignId, campaignName, personalize, contactIds, segment } = action.payload as {
      campaignId?: string;
      campaignName?: string;
      personalize?: boolean;
      contactIds?: string[];
      segment?: string;
    };

    // Resolve campaign
    let campaign;
    if (campaignId) {
      campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
    } else if (campaignName) {
      campaign = await prisma.emailCampaign.findFirst({
        where: { userId: ctx.user_id, name: { contains: campaignName, mode: "insensitive" } },
      });
    }

    if (!campaign) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "Campaign not found. Create a campaign first in Marketing > Email.",
      };
    }

    if (campaign.userId !== ctx.user_id) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "Campaign belongs to a different user",
      };
    }

    // Resolve contacts
    let resolvedContactIds = contactIds ?? [];
    if (resolvedContactIds.length === 0 && segment) {
      const where: Record<string, unknown> = { userId: ctx.user_id };
      if (segment !== "all") where.type = segment.slice(0, -1); // "leads" -> "lead"
      const contacts = await prisma.contact.findMany({
        where,
        select: { id: true },
        take: 500,
      });
      resolvedContactIds = contacts.map((c) => c.id);
    }

    if (resolvedContactIds.length === 0) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "No contacts specified. Provide contactIds or a segment (all, leads, clients, agents, vendors).",
      };
    }

    // Create recipient rows
    await prisma.emailCampaignRecipient.createMany({
      data: resolvedContactIds.map((cid) => ({
        campaignId: campaign.id,
        contactId: cid,
        status: "pending",
      })),
      skipDuplicates: true,
    });

    // Set campaign active + personalization flag
    await prisma.emailCampaign.update({
      where: { id: campaign.id },
      data: {
        status: "active",
        ...(personalize ? { metadata: { ...(campaign.metadata as object ?? {}), personalize: true } } : {}),
      },
    });

    const result = await executeCampaign(campaign.id, ctx.user_id);

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success" as const,
      data: {
        campaignName: campaign.name,
        sent: result.sent,
        failed: result.failed,
        total: result.total,
        message: `Campaign "${campaign.name}" sent to ${result.sent} contacts${result.failed > 0 ? ` (${result.failed} failed)` : ""}`,
      },
    };
  },

  "email.draft": async (action, ctx) => {
    if (action.type !== "email.draft") throw new Error("Invalid action type");

    const { contactId, contactName, purpose } = action.payload as {
      contactId?: string;
      contactName?: string;
      purpose?: string;
    };

    let resolvedContactId = contactId;

    if (!resolvedContactId && contactName) {
      const contact = await prisma.contact.findFirst({
        where: {
          userId: ctx.user_id,
          name: { contains: contactName, mode: "insensitive" },
        },
        select: { id: true },
      });
      resolvedContactId = contact?.id;
    }

    if (!resolvedContactId) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "Contact not found. Provide a contactId or contactName.",
      };
    }

    const draft = await draftContextualEmail(resolvedContactId, ctx.user_id, purpose);

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success" as const,
      data: {
        subject: draft.subject,
        body: draft.body,
        context_used: draft.context_used,
        message: `Here's a draft email:\n\nSubject: ${draft.subject}\n\n${draft.body}`,
      },
    };
  },
};
