import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { ActionDefinition } from "./types";

const parameters = z.object({}).default({});

export const getPipelineSummary: ActionDefinition<typeof parameters> = {
  name: "getPipelineSummary",
  description:
    "Get a summary of the user's deal pipeline: total deals, value by stage, and overall pipeline value.",
  parameters,
  riskTier: 0,

  async execute(_params, ctx) {
    const deals = await prisma.deal.findMany({
      where: { userId: ctx.profileId },
      select: { stage: true, value: true },
    });

    if (deals.length === 0) {
      return {
        success: true,
        message: "Your pipeline is empty — no deals yet.",
        data: { totalDeals: 0, totalValue: 0, byStage: {} },
      };
    }

    const byStage: Record<string, { count: number; value: number }> = {};
    let totalValue = 0;

    for (const deal of deals) {
      if (!byStage[deal.stage]) {
        byStage[deal.stage] = { count: 0, value: 0 };
      }
      byStage[deal.stage].count++;
      byStage[deal.stage].value += deal.value ?? 0;
      totalValue += deal.value ?? 0;
    }

    const stageLabels: Record<string, string> = {
      new_lead: "New Lead",
      qualified: "Qualified",
      showing: "Showing",
      offer: "Offer",
      negotiation: "Negotiation",
      closed: "Closed",
    };

    const lines = Object.entries(byStage).map(([stage, info]) => {
      const label = stageLabels[stage] ?? stage;
      return `• ${label}: ${info.count} deal(s), $${info.value.toLocaleString()}`;
    });

    return {
      success: true,
      message:
        `Pipeline: ${deals.length} deal(s), $${totalValue.toLocaleString()} total.\n` +
        lines.join("\n"),
      data: { totalDeals: deals.length, totalValue, byStage },
    };
  },
};
