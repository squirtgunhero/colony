// ============================================================================
// COLONY - Deal Forecasting Engine
// Computes pipeline forecasts using stage-based probabilities
// ============================================================================

import { prisma } from "@/lib/prisma";

// Default stage → probability mapping (can be overridden per user later)
const STAGE_PROBABILITIES: Record<string, number> = {
  new_lead: 10,
  qualified: 25,
  showing: 40,
  offer: 60,
  negotiation: 80,
  closed: 100,
};

export interface ForecastSummary {
  totalPipeline: number;        // Sum of all deal values
  weightedPipeline: number;     // Sum of weighted values
  dealCount: number;
  avgDealSize: number;
  avgProbability: number;
  byStage: Array<{
    stage: string;
    count: number;
    totalValue: number;
    weightedValue: number;
    probability: number;
  }>;
  byMonth: Array<{
    month: string;              // YYYY-MM
    count: number;
    totalValue: number;
    weightedValue: number;
  }>;
  winRate: number;              // % of closed deals vs total historical
  avgCycleLength: number;       // Avg days from creation to close
}

/**
 * Update probability and weighted value for a deal based on its stage.
 * Can be called whenever a deal stage changes.
 */
export async function updateDealProbability(dealId: string, stage?: string): Promise<void> {
  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!deal) return;

  const currentStage = stage || deal.stage;
  const probability = deal.probability ?? STAGE_PROBABILITIES[currentStage] ?? 0;
  const weightedValue = (deal.value ?? 0) * (probability / 100);

  await prisma.deal.update({
    where: { id: dealId },
    data: { probability, weightedValue },
  });
}

/**
 * Generate a complete forecast for a user's pipeline.
 */
export async function generateForecast(userId: string): Promise<ForecastSummary> {
  const deals = await prisma.deal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  // Auto-assign probabilities to deals that don't have them
  const updates: Promise<unknown>[] = [];
  for (const deal of deals) {
    if (deal.probability == null && deal.stage !== "closed") {
      const prob = STAGE_PROBABILITIES[deal.stage] ?? 0;
      updates.push(
        prisma.deal.update({
          where: { id: deal.id },
          data: {
            probability: prob,
            weightedValue: (deal.value ?? 0) * (prob / 100),
          },
        })
      );
    }
  }
  if (updates.length > 0) await Promise.all(updates);

  // Reload with updated data
  const allDeals = await prisma.deal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const openDeals = allDeals.filter((d) => d.stage !== "closed");
  const closedDeals = allDeals.filter((d) => d.stage === "closed");

  // Pipeline totals
  const totalPipeline = openDeals.reduce((sum, d) => sum + (d.value ?? 0), 0);
  const weightedPipeline = openDeals.reduce((sum, d) => {
    const prob = d.probability ?? STAGE_PROBABILITIES[d.stage] ?? 0;
    return sum + (d.value ?? 0) * (prob / 100);
  }, 0);

  const dealCount = openDeals.length;
  const avgDealSize = dealCount > 0 ? totalPipeline / dealCount : 0;
  const avgProbability = dealCount > 0
    ? openDeals.reduce((sum, d) => sum + (d.probability ?? STAGE_PROBABILITIES[d.stage] ?? 0), 0) / dealCount
    : 0;

  // By stage
  const stageMap = new Map<string, { count: number; totalValue: number; weightedValue: number }>();
  for (const deal of openDeals) {
    const entry = stageMap.get(deal.stage) || { count: 0, totalValue: 0, weightedValue: 0 };
    entry.count++;
    entry.totalValue += deal.value ?? 0;
    const prob = deal.probability ?? STAGE_PROBABILITIES[deal.stage] ?? 0;
    entry.weightedValue += (deal.value ?? 0) * (prob / 100);
    stageMap.set(deal.stage, entry);
  }

  const stageOrder = Object.keys(STAGE_PROBABILITIES);
  const byStage = stageOrder
    .filter((s) => stageMap.has(s))
    .map((stage) => ({
      stage,
      ...stageMap.get(stage)!,
      probability: STAGE_PROBABILITIES[stage] ?? 0,
    }));

  // By expected close month
  const monthMap = new Map<string, { count: number; totalValue: number; weightedValue: number }>();
  for (const deal of openDeals) {
    const date = deal.expectedCloseDate ?? deal.createdAt;
    const month = date.toISOString().slice(0, 7);
    const entry = monthMap.get(month) || { count: 0, totalValue: 0, weightedValue: 0 };
    entry.count++;
    entry.totalValue += deal.value ?? 0;
    const prob = deal.probability ?? STAGE_PROBABILITIES[deal.stage] ?? 0;
    entry.weightedValue += (deal.value ?? 0) * (prob / 100);
    monthMap.set(month, entry);
  }

  const byMonth = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }));

  // Win rate (closed deals / total ever)
  const winRate = allDeals.length > 0 ? (closedDeals.length / allDeals.length) * 100 : 0;

  // Average cycle length for closed deals
  const cycleLengths = closedDeals
    .filter((d) => d.closedAt)
    .map((d) => Math.floor((new Date(d.closedAt!).getTime() - new Date(d.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
  const avgCycleLength = cycleLengths.length > 0
    ? cycleLengths.reduce((sum, d) => sum + d, 0) / cycleLengths.length
    : 0;

  return {
    totalPipeline,
    weightedPipeline,
    dealCount,
    avgDealSize,
    avgProbability,
    byStage,
    byMonth,
    winRate,
    avgCycleLength,
  };
}
