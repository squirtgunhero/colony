// ============================================================================
// COLONY - Property Opportunity Scoring Engine
// Calculates a 0-100 score for properties based on deterministic signals + AI
// ============================================================================

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AnthropicProvider } from "@/lam/llm";

// ============================================================================
// Enrichment fields used for data completeness scoring
// ============================================================================

const ENRICHMENT_FIELDS = [
  "assessedValue",
  "marketValue",
  "yearBuilt",
  "lotSizeSqft",
  "zoning",
  "ownerName",
  "lastSaleDate",
  "lastSalePrice",
  "bedrooms",
  "bathrooms",
  "sqft",
  "propertyType",
] as const;

// ============================================================================
// AI response schema
// ============================================================================

const aiScoringSchema = z.object({
  score: z.number().min(0).max(40),
  reasoning: z.string(),
  opportunityType: z.string(), // e.g. "distressed", "equity_rich", "long_hold", "absentee_owner", "below_market"
});

// ============================================================================
// Deterministic scoring (max 60 points)
// ============================================================================

function computeDeterministicScore(property: Record<string, unknown>): {
  score: number;
  breakdown: Record<string, number>;
} {
  const breakdown: Record<string, number> = {
    belowMarket: 0,
    equity: 0,
    ownershipDuration: 0,
    dataCompleteness: 0,
    conditionSignals: 0,
  };

  // 1. Below-market value (max 15 pts)
  const assessedValue = property.assessedValue as number | null;
  const price = property.price as number | null;
  if (assessedValue && price && price > 0) {
    const ratio = assessedValue / price;
    if (ratio > 1.3) breakdown.belowMarket = 15;
    else if (ratio > 1.15) breakdown.belowMarket = 10;
    else if (ratio > 1.0) breakdown.belowMarket = 5;
  }

  // 2. Equity position (max 15 pts)
  const lastSalePrice = property.lastSalePrice as number | null;
  if (lastSalePrice && price) {
    if (lastSalePrice < price * 0.5) breakdown.equity = 15;
    else if (lastSalePrice < price * 0.7) breakdown.equity = 10;
    else if (lastSalePrice < price * 0.85) breakdown.equity = 5;
  }

  // 3. Ownership duration (max 10 pts)
  const lastSaleDate = property.lastSaleDate as Date | string | null;
  if (lastSaleDate) {
    const saleDate = new Date(lastSaleDate);
    const yearsSinceSale =
      (Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (yearsSinceSale >= 15) breakdown.ownershipDuration = 10;
    else if (yearsSinceSale >= 10) breakdown.ownershipDuration = 7;
    else if (yearsSinceSale >= 5) breakdown.ownershipDuration = 4;
  }

  // 4. Data completeness (max 10 pts)
  let populated = 0;
  for (const field of ENRICHMENT_FIELDS) {
    if (property[field] != null && property[field] !== "") {
      populated++;
    }
  }
  breakdown.dataCompleteness = Math.min(10, populated);

  // 5. Property condition signals (max 10 pts)
  const yearBuilt = property.yearBuilt as number | null;
  if (yearBuilt && yearBuilt < 1970) {
    breakdown.conditionSignals += 5;
  }
  const ownerOccupied = property.ownerOccupied as boolean | null;
  if (ownerOccupied === false) {
    breakdown.conditionSignals += 5;
  }

  const score = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
  return { score: Math.min(60, score), breakdown };
}

// ============================================================================
// AI scoring (max 40 points)
// ============================================================================

async function computeAIScore(
  property: Record<string, unknown>
): Promise<{ score: number; reasoning: string; opportunityType: string } | null> {
  try {
    const llm = new AnthropicProvider();

    const result = await llm.completeJSON(
      [
        {
          role: "system",
          content:
            "You are a real estate investment analyst AI. Analyze this property data and score the investment/acquisition opportunity from 0-40. Consider: motivated seller signals, equity position, market value vs asking price, property age/condition indicators, ownership patterns, and neighborhood context. Return a score and brief reasoning.",
        },
        {
          role: "user",
          content: JSON.stringify(property, null, 2),
        },
      ],
      aiScoringSchema,
      { temperature: 0.3 }
    );

    return result.data;
  } catch {
    // AI call failed (no API key, network error, etc.) — return null
    return null;
  }
}

// ============================================================================
// Grade mapping
// ============================================================================

function getGrade(score: number): string {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  if (score >= 20) return "D";
  return "F";
}

/**
 * Get the hex color for a grade letter, for UI display.
 */
export function getGradeColor(grade: string): string {
  switch (grade) {
    case "A":
      return "#22c55e"; // green
    case "B":
      return "#3b82f6"; // blue
    case "C":
      return "#eab308"; // yellow
    case "D":
      return "#f97316"; // orange
    default:
      return "#ef4444"; // red
  }
}

// ============================================================================
// Main entry point
// ============================================================================

/**
 * Score a single property's investment/acquisition opportunity and persist the result.
 */
export async function scoreProperty(
  propertyId: string
): Promise<{ score: number; grade: string; reasoning: string }> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
  });

  if (!property) throw new Error("Property not found");

  // Cast to generic record so we can access dynamic fields
  const data = property as unknown as Record<string, unknown>;

  // Deterministic signals (max 60)
  const { score: deterministicScore, breakdown } =
    computeDeterministicScore(data);

  // AI analysis (max 40)
  const aiResult = await computeAIScore(data);

  let totalScore: number;
  let reasoning: string;

  if (aiResult) {
    // Combine deterministic + AI scores
    totalScore = Math.min(100, deterministicScore + aiResult.score);
    reasoning = `[${aiResult.opportunityType}] ${aiResult.reasoning} (Deterministic: ${deterministicScore}/60, AI: ${aiResult.score}/40)`;
  } else {
    // No AI available — scale deterministic score to full 100-point range
    totalScore = Math.min(100, Math.round((deterministicScore / 60) * 100));
    reasoning = `Deterministic scoring only (AI unavailable). Breakdown: ${JSON.stringify(breakdown)}`;
  }

  const grade = getGrade(totalScore);

  await prisma.property.update({
    where: { id: propertyId },
    data: {
      opportunityScore: totalScore,
      opportunityGrade: grade,
      opportunityReasoning: reasoning,
      opportunityScoredAt: new Date(),
    },
  });

  return { score: totalScore, grade, reasoning };
}
