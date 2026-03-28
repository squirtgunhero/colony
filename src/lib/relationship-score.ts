// ============================================================================
// COLONY - Relationship Intelligence Score
// Weighted algorithm: Recency (30) + Frequency (25) + Depth (20) +
//                     Deal Activity (15) + Task Health (10) = 100
// ============================================================================

import { prisma } from "./prisma";

export interface ScoreFactors {
  recency: number; // 0-30
  frequency: number; // 0-25
  depth: number; // 0-20
  dealActivity: number; // 0-15
  taskHealth: number; // 0-10
  total: number; // 0-100
  label: "hot" | "warm" | "cold";
  color: string;
}

// Legacy interface kept for backward compatibility with existing callers
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

function labelAndColor(score: number): { label: "hot" | "warm" | "cold"; color: string } {
  if (score >= 80) return { label: "hot", color: "#22c55e" };
  if (score >= 50) return { label: "warm", color: "#f59e0b" };
  return { label: "cold", color: "#94a3b8" };
}

// ---------------------------------------------------------------------------
// Recency (0-30 pts) — exponential decay from most recent interaction
// ---------------------------------------------------------------------------
function recencyScore(daysSince: number | null): number {
  if (daysSince === null) return 0;
  if (daysSince <= 0) return 30;
  // Half-life of 7 days: score = 30 * 0.5^(days/7)
  return Math.round(30 * Math.pow(0.5, daysSince / 7));
}

// ---------------------------------------------------------------------------
// Frequency (0-25 pts) — log-scale count of interactions in last 90 days
// ---------------------------------------------------------------------------
function frequencyScore(interactionCount: number): number {
  if (interactionCount <= 0) return 0;
  // log2(count + 1) scaled so ~32 interactions = 25 pts
  return Math.min(25, Math.round(5 * Math.log2(interactionCount + 1)));
}

// ---------------------------------------------------------------------------
// Depth (0-20 pts) — meetings weighted 3x vs emails
// ---------------------------------------------------------------------------
function depthScore(emailCount: number, meetingCount: number): number {
  const weightedTotal = emailCount + meetingCount * 3;
  if (weightedTotal <= 0) return 0;
  // log2 scale, ~16 weighted interactions → 20 pts
  return Math.min(20, Math.round(5 * Math.log2(weightedTotal + 1)));
}

// ---------------------------------------------------------------------------
// Deal activity (0-15 pts) — active deals + pipeline momentum
// ---------------------------------------------------------------------------
function dealActivityScore(
  activeDeals: number,
  highestStageIndex: number // 0-5 mapping to deal pipeline stages
): number {
  if (activeDeals === 0) return 0;
  // Base: 5 pts for having any active deal, +2 per additional (max 10)
  const base = Math.min(10, 5 + (activeDeals - 1) * 2);
  // Stage momentum: up to 5 pts based on furthest stage
  const momentum = Math.round((highestStageIndex / 5) * 5);
  return Math.min(15, base + momentum);
}

// ---------------------------------------------------------------------------
// Task health (0-10 pts) — full points if no overdue tasks
// ---------------------------------------------------------------------------
function taskHealthScore(overdueTasks: number, totalOpenTasks: number): number {
  if (totalOpenTasks === 0) return 10; // No tasks = healthy
  if (overdueTasks === 0) return 10;
  // Lose points proportional to overdue ratio
  const ratio = overdueTasks / totalOpenTasks;
  return Math.round(10 * (1 - ratio));
}

const STAGE_ORDER: Record<string, number> = {
  new_lead: 0,
  qualified: 1,
  showing: 2,
  offer: 3,
  negotiation: 4,
  closed: 5,
};

// ---------------------------------------------------------------------------
// Main: full database-backed score calculation
// ---------------------------------------------------------------------------
export async function calculateRelationshipScore(
  contactId: string
): Promise<number> {
  const breakdown = await getScoreBreakdown(contactId);
  return breakdown.total;
}

export async function getScoreBreakdown(
  contactId: string
): Promise<ScoreFactors> {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Fetch all data in parallel
  const [contact, emailCount, meetingCount, recentEmails, recentMeetings] =
    await Promise.all([
      prisma.contact.findUnique({
        where: { id: contactId },
        include: {
          deals: { where: { stage: { not: "closed" } } },
          tasks: { where: { completed: false } },
          activities: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      prisma.emailInteraction.count({
        where: { contactId, occurredAt: { gte: ninetyDaysAgo } },
      }),
      prisma.meetingInteraction.count({
        where: { contactId, startTime: { gte: ninetyDaysAgo } },
      }),
      prisma.emailInteraction.findFirst({
        where: { contactId },
        orderBy: { occurredAt: "desc" },
        select: { occurredAt: true },
      }),
      prisma.meetingInteraction.findFirst({
        where: { contactId },
        orderBy: { startTime: "desc" },
        select: { startTime: true },
      }),
    ]);

  if (!contact) {
    return { recency: 0, frequency: 0, depth: 0, dealActivity: 0, taskHealth: 10, total: 10, ...labelAndColor(10) };
  }

  // Determine most recent interaction (email, meeting, or CRM activity)
  const candidates: Date[] = [];
  if (recentEmails?.occurredAt) candidates.push(new Date(recentEmails.occurredAt));
  if (recentMeetings?.startTime) candidates.push(new Date(recentMeetings.startTime));
  if (contact.activities[0]?.createdAt) candidates.push(new Date(contact.activities[0].createdAt));
  if (contact.lastContactedAt) candidates.push(new Date(contact.lastContactedAt));

  const mostRecent = candidates.length > 0 ? new Date(Math.max(...candidates.map((d) => d.getTime()))) : null;
  const daysSince = mostRecent ? (now.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24) : null;

  // Deal activity
  const activeDeals = contact.deals.length;
  let highestStage = 0;
  for (const deal of contact.deals) {
    const idx = STAGE_ORDER[deal.stage] ?? 0;
    if (idx > highestStage) highestStage = idx;
  }

  // Task health
  const openTasks = contact.tasks;
  const overdue = openTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now).length;

  const totalInteractions = emailCount + meetingCount;

  const r = recencyScore(daysSince);
  const f = frequencyScore(totalInteractions);
  const d = depthScore(emailCount, meetingCount);
  const da = dealActivityScore(activeDeals, highestStage);
  const th = taskHealthScore(overdue, openTasks.length);
  const total = Math.max(0, Math.min(100, r + f + d + da + th));

  return {
    recency: r,
    frequency: f,
    depth: d,
    dealActivity: da,
    taskHealth: th,
    total,
    ...labelAndColor(total),
  };
}

// ---------------------------------------------------------------------------
// Legacy sync wrapper — used by existing server components that compute
// score on-the-fly without hitting the database
// ---------------------------------------------------------------------------
export function calculateRelationshipScoreLegacy(
  input: RelationshipScoreInput
): RelationshipScoreResult {
  let score = 50;

  if (input.daysSinceLastActivity === null) {
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

  if (input.totalActivities >= 10) score += 15;
  else if (input.totalActivities >= 5) score += 8;
  else if (input.totalActivities >= 1) score += 3;

  if (input.hasActiveDeal) score += 15;
  if (input.hasOverdueTasks) score -= 10;

  score = Math.max(0, Math.min(100, score));
  return { score, ...labelAndColor(score) };
}
