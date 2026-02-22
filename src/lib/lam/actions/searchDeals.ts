import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { ActionDefinition } from "./types";

const parameters = z.object({
  query: z.string().min(1),
  stage: z
    .enum(["new_lead", "qualified", "showing", "offer", "negotiation", "closed"])
    .optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

export const searchDeals: ActionDefinition<typeof parameters> = {
  name: "searchDeals",
  description:
    "Search deals by title. Optionally filter by stage (new_lead/qualified/showing/offer/negotiation/closed).",
  parameters,
  riskTier: 0,

  async execute(params, ctx) {
    const deals = await prisma.deal.findMany({
      where: {
        userId: ctx.profileId,
        title: { contains: params.query, mode: "insensitive" },
        ...(params.stage ? { stage: params.stage } : {}),
      },
      take: params.limit,
      orderBy: { updatedAt: "desc" },
    });

    if (deals.length === 0) {
      return {
        success: true,
        message: `No deals found for "${params.query}".`,
        data: [],
      };
    }

    const summary = deals
      .map((d) => {
        const val = d.value ? ` ($${d.value.toLocaleString()})` : "";
        return `${d.title}${val} — ${d.stage}`;
      })
      .join(", ");

    return {
      success: true,
      message: `Found ${deals.length} deal(s): ${summary}.`,
      data: deals,
    };
  },
};
