import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendSMS as twilioSend } from "@/lib/twilio";
import type { ActionDefinition } from "./types";

const parameters = z
  .object({
    contactId: z.string().optional(),
    phoneNumber: z.string().optional(),
    message: z.string().min(1).max(1600),
  })
  .refine((d) => d.contactId || d.phoneNumber, {
    message: "Either contactId or phoneNumber is required",
  });

export const sendSMSAction: ActionDefinition<typeof parameters> = {
  name: "sendSMS",
  description:
    "Send an SMS message. Provide either a contactId (phone number will be looked up) " +
    "or a direct phoneNumber in E.164 format. Message must be under 1600 characters. " +
    "This is an external action that requires approval.",
  parameters,
  riskTier: 2,

  async execute(params, ctx) {
    let to = params.phoneNumber;
    let recipientName = params.phoneNumber ?? "contact";

    if (params.contactId) {
      const contact = await prisma.contact.findUnique({
        where: { id: params.contactId },
      });

      if (!contact) {
        return { success: false, message: "Contact not found." };
      }

      if (contact.userId !== ctx.profileId) {
        return {
          success: false,
          message: "Contact belongs to a different user.",
        };
      }

      if (!contact.phone) {
        return {
          success: false,
          message: `${contact.name} doesn't have a phone number on file.`,
        };
      }

      to = contact.phone;
      recipientName = contact.name;
    }

    const result = await twilioSend(to!, params.message);

    await prisma.sMSMessage.create({
      data: {
        profileId: ctx.profileId,
        direction: "outbound",
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: to!,
        body: params.message,
        twilioSid: result.sid,
        status: "sent",
        lamRunId: ctx.runId,
      },
    });

    return {
      success: true,
      message: `SMS sent to ${recipientName}.`,
      data: { sid: result.sid, to },
    };
  },
};
