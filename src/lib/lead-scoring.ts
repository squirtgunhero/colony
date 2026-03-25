// ============================================================================
// COLONY - Lead Scoring Engine
// Calculates a 0-100 score for contacts based on configurable signals
// ============================================================================

import { prisma } from "@/lib/prisma";

interface ScoringInput {
  contact: {
    id: string;
    email?: string | null;
    phone?: string | null;
    type: string;
    source?: string | null;
    tags: string[];
    createdAt: Date;
    lastContactedAt?: Date | null;
  };
  activityCount: number;
  dealCount: number;
  maxDealValue: number;
  hasActiveDeal: boolean;
  taskCount: number;
  overdueTaskCount: number;
}

interface ScoreSignals {
  engagement: number;  // Based on activity count & recency
  fit: number;         // Based on data completeness & type
  recency: number;     // Based on how recently contacted
  activity: number;    // Based on deals, tasks, deal value
}

function computeScore(input: ScoringInput): { score: number; grade: string; signals: ScoreSignals } {
  const signals: ScoreSignals = { engagement: 0, fit: 0, recency: 0, activity: 0 };

  // --- Engagement (max 30 points) ---
  // Activity count
  if (input.activityCount >= 20) signals.engagement += 15;
  else if (input.activityCount >= 10) signals.engagement += 12;
  else if (input.activityCount >= 5) signals.engagement += 8;
  else if (input.activityCount >= 1) signals.engagement += 4;

  // Has active deal = strong engagement
  if (input.hasActiveDeal) signals.engagement += 10;
  // Has tasks assigned
  if (input.taskCount > 0) signals.engagement += 5;

  signals.engagement = Math.min(30, signals.engagement);

  // --- Fit (max 25 points) ---
  // Data completeness
  if (input.contact.email) signals.fit += 5;
  if (input.contact.phone) signals.fit += 5;
  if (input.contact.source) signals.fit += 3;
  if (input.contact.tags.length > 0) signals.fit += 2;

  // Contact type weighting
  if (input.contact.type === "client") signals.fit += 10;
  else if (input.contact.type === "lead") signals.fit += 5;
  else if (input.contact.type === "agent") signals.fit += 3;

  signals.fit = Math.min(25, signals.fit);

  // --- Recency (max 25 points) ---
  const lastContact = input.contact.lastContactedAt;
  if (lastContact) {
    const daysSince = Math.floor((Date.now() - new Date(lastContact).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince <= 1) signals.recency = 25;
    else if (daysSince <= 3) signals.recency = 22;
    else if (daysSince <= 7) signals.recency = 18;
    else if (daysSince <= 14) signals.recency = 14;
    else if (daysSince <= 30) signals.recency = 10;
    else if (daysSince <= 60) signals.recency = 5;
    else signals.recency = 2;
  }

  // --- Activity/Value (max 20 points) ---
  // Deal value
  if (input.maxDealValue >= 500000) signals.activity += 10;
  else if (input.maxDealValue >= 100000) signals.activity += 8;
  else if (input.maxDealValue >= 50000) signals.activity += 5;
  else if (input.maxDealValue > 0) signals.activity += 3;

  // Deal count
  if (input.dealCount >= 3) signals.activity += 5;
  else if (input.dealCount >= 1) signals.activity += 3;

  // Overdue tasks = urgency signal
  if (input.overdueTaskCount > 0) signals.activity += 5;

  signals.activity = Math.min(20, signals.activity);

  const score = Math.min(100, signals.engagement + signals.fit + signals.recency + signals.activity);

  const grade =
    score >= 80 ? "A" :
    score >= 60 ? "B" :
    score >= 40 ? "C" :
    score >= 20 ? "D" : "F";

  return { score, grade, signals };
}

/**
 * Score a single contact and upsert the result.
 */
export async function scoreContact(contactId: string): Promise<{ score: number; grade: string }> {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    include: {
      activities: { select: { id: true } },
      deals: { select: { id: true, value: true, stage: true } },
      tasks: { select: { id: true, completed: true, dueDate: true } },
    },
  });

  if (!contact) throw new Error("Contact not found");

  const activeDeal = contact.deals.some((d) => d.stage !== "closed");
  const maxDealValue = Math.max(0, ...contact.deals.map((d) => d.value ?? 0));
  const overdueTasks = contact.tasks.filter(
    (t) => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()
  );

  const { score, grade, signals } = computeScore({
    contact,
    activityCount: contact.activities.length,
    dealCount: contact.deals.length,
    maxDealValue,
    hasActiveDeal: activeDeal,
    taskCount: contact.tasks.length,
    overdueTaskCount: overdueTasks.length,
  });

  await prisma.leadScore.upsert({
    where: { contactId },
    create: { contactId, score, grade, signals: signals as unknown as Record<string, number> },
    update: { score, grade, signals: signals as unknown as Record<string, number>, scoredAt: new Date() },
  });

  return { score, grade };
}

/**
 * Score all contacts for a user. Returns count of scored contacts.
 */
export async function scoreAllContacts(userId: string): Promise<{ scored: number; topLeads: Array<{ name: string; score: number; grade: string }> }> {
  const contacts = await prisma.contact.findMany({
    where: { userId },
    select: { id: true, name: true },
  });

  const results: Array<{ name: string; score: number; grade: string }> = [];

  for (const contact of contacts) {
    try {
      const { score, grade } = await scoreContact(contact.id);
      results.push({ name: contact.name, score, grade });
    } catch {
      // Skip contacts that fail scoring
    }
  }

  results.sort((a, b) => b.score - a.score);

  return {
    scored: results.length,
    topLeads: results.slice(0, 10),
  };
}

/**
 * Get the score grade color for UI display.
 */
export function getGradeColor(grade: string): string {
  switch (grade) {
    case "A": return "#22c55e"; // green
    case "B": return "#84cc16"; // lime
    case "C": return "#eab308"; // yellow
    case "D": return "#f97316"; // orange
    default: return "#ef4444";  // red
  }
}
