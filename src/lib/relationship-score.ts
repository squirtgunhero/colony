export interface RelationshipScoreInput {
  daysSinceLastActivity: number | null;
  totalActivities: number;
  hasActiveDeal: boolean;
  hasOverdueTasks: boolean;
}

export interface RelationshipScoreResult {
  score: number;
  label: "hot" | "warm" | "cold";
  color: string;
}

export function calculateRelationshipScore(
  input: RelationshipScoreInput
): RelationshipScoreResult {
  let score = 50;

  // Recency factor
  if (input.daysSinceLastActivity === null) {
    // Never contacted
    score -= 15;
  } else if (input.daysSinceLastActivity <= 3) {
    score += 20;
  } else if (input.daysSinceLastActivity <= 7) {
    score += 10;
  } else if (input.daysSinceLastActivity <= 14) {
    score -= 5;
  } else {
    score -= 20;
  }

  // Engagement volume
  if (input.totalActivities >= 10) {
    score += 15;
  } else if (input.totalActivities >= 5) {
    score += 8;
  } else if (input.totalActivities >= 1) {
    score += 3;
  }

  // Active deal bonus
  if (input.hasActiveDeal) {
    score += 15;
  }

  // Overdue tasks penalty
  if (input.hasOverdueTasks) {
    score -= 10;
  }

  score = Math.max(0, Math.min(100, score));

  let label: "hot" | "warm" | "cold";
  let color: string;

  if (score >= 80) {
    label = "hot";
    color = "#22c55e"; // green
  } else if (score >= 50) {
    label = "warm";
    color = "#f59e0b"; // amber
  } else {
    label = "cold";
    color = "#94a3b8"; // slate
  }

  return { score, label, color };
}
