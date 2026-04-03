// Communications Domain Executors — Email, SMS
import { prisma } from "@/lib/prisma";
import { sendSMS } from "@/lib/twilio";
import { sendGmailEmail } from "@/lib/gmail";
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
};
