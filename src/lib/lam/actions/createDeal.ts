import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { ActionDefinition } from "./types";

const DealStage = z.enum([
  "new_lead",
  "qualified",
  "showing",
  "offer",
  "negotiation",
  "closed",
]);

const parameters = z.object({
  title: z.string().min(1),
  value: z.number().optional(),
  stage: DealStage.default("new_lead"),
  contactId: z.string().optional(),
  propertyId: z.string().optional(),
  expectedCloseDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const createDeal: ActionDefinition<typeof parameters> = {
  name: "createDeal",
  description:
    "Create a new deal in the pipeline. Requires a title. " +
    "Optionally include value, stage (new_lead/qualified/showing/offer/negotiation/closed), " +
    "contactId, propertyId, expectedCloseDate, and notes.",
  parameters,
  riskTier: 1,

  async execute(params, ctx) {
    const deal = await prisma.deal.create({
      data: {
        userId: ctx.profileId,
        title: params.title,
        value: params.value,
        stage: params.stage,
        contactId: params.contactId,
        propertyId: params.propertyId,
        expectedCloseDate: params.expectedCloseDate
          ? new Date(params.expectedCloseDate)
          : null,
        notes: params.notes,
      },
    });

    const valuePart = deal.value ? ` worth $${deal.value.toLocaleString()}` : "";
    return {
      success: true,
      message: `Created deal "${deal.title}"${valuePart}.`,
      data: deal,
    };
  },
};
