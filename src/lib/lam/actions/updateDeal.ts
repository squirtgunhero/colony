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

const parameters = z
  .object({
    id: z.string().optional(),
    title: z.string().optional(),
    patch: z.object({
      title: z.string().optional(),
      value: z.number().optional(),
      stage: DealStage.optional(),
      contactId: z.string().optional(),
      propertyId: z.string().optional(),
      expectedCloseDate: z.string().datetime().optional(),
      notes: z.string().optional(),
      isFavorite: z.boolean().optional(),
    }),
  })
  .refine((d) => d.id || d.title, {
    message: "Either id or title is required to identify the deal",
  });

export const updateDeal: ActionDefinition<typeof parameters> = {
  name: "updateDeal",
  description:
    "Update an existing deal. Identify the deal by id or title. " +
    "Provide a patch object with fields to change: title, value, stage, contactId, propertyId, expectedCloseDate, notes, isFavorite. " +
    "Use this to move a deal to a different stage as well.",
  parameters,
  riskTier: 1,

  async execute(params, ctx) {
    let dealId = params.id;

    if (!dealId && params.title) {
      const found = await prisma.deal.findFirst({
        where: {
          userId: ctx.profileId,
          title: { contains: params.title, mode: "insensitive" },
        },
        orderBy: { updatedAt: "desc" },
      });

      if (!found) {
        return {
          success: false,
          message: `Could not find a deal titled "${params.title}".`,
        };
      }
      dealId = found.id;
    }

    const before = await prisma.deal.findUnique({ where: { id: dealId! } });
    if (!before) {
      return { success: false, message: "Deal not found." };
    }

    if (before.userId !== ctx.profileId) {
      return { success: false, message: "Deal belongs to a different user." };
    }

    const { expectedCloseDate, ...rest } = params.patch;
    const data: Record<string, unknown> = { ...rest, updatedAt: new Date() };
    if (expectedCloseDate) {
      data.expectedCloseDate = new Date(expectedCloseDate);
    }

    const deal = await prisma.deal.update({
      where: { id: dealId! },
      data,
    });

    const fields = Object.keys(params.patch)
      .filter((k) => (params.patch as Record<string, unknown>)[k] !== undefined)
      .join(", ");

    return {
      success: true,
      message: `Updated deal "${deal.title}" (${fields}).`,
      data: deal,
    };
  },
};
