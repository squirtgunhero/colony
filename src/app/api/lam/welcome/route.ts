// ============================================================================
// GET /api/lam/welcome
// Returns a personalized welcome message with status lines and quick-action chips.
// Pure logic — no LLM call needed. Deterministic based on time + account data.
// ============================================================================

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

function buildGreeting(firstName: string | null): string {
  const hour = new Date().getHours();
  const name = firstName ?? "there";
  if (hour >= 5 && hour < 12) return `Good morning, ${name}.`;
  if (hour >= 12 && hour < 17) return `Good afternoon, ${name}.`;
  if (hour >= 17 && hour < 21) return `Good evening, ${name}.`;
  return `Good evening, ${name}.`;
}

export async function GET() {
  // Fallback greeting in case of any error
  const fallbackGreeting = buildGreeting(null);

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile for first name and account age
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { fullName: true, createdAt: true },
    });

    const firstName = profile?.fullName?.split(" ")[0] ?? null;
    const greeting = buildGreeting(firstName);

    // Time windows for queries
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Run all account queries in parallel
    const [tasksDueCount, staleDealsCount, activeCampaign, recentContactCount] =
      await Promise.all([
        // Tasks due today (incomplete)
        prisma.task.count({
          where: {
            userId: user.id,
            completed: false,
            dueDate: { gte: todayStart, lte: todayEnd },
          },
        }),

        // Open deals with no activity in 3+ days
        prisma.deal.count({
          where: {
            userId: user.id,
            stage: { not: "closed" },
            updatedAt: { lt: threeDaysAgo },
          },
        }),

        // Any active Honeycomb campaign
        prisma.honeycombCampaign.findFirst({
          where: { userId: user.id, status: "active" },
          select: { name: true },
        }),

        // Contacts added in the last 7 days
        prisma.contact.count({
          where: {
            userId: user.id,
            createdAt: { gte: sevenDaysAgo },
          },
        }),
      ]);

    // Account is "established" if it was created more than 7 days ago
    const isEstablished = profile?.createdAt
      ? profile.createdAt < sevenDaysAgo
      : false;

    // ── Status lines (max 2, priority order) ─────────────────────────────────
    const statusLines: string[] = [];

    if (tasksDueCount >= 1) {
      statusLines.push(
        `You have ${tasksDueCount} task${tasksDueCount > 1 ? "s" : ""} due today.`
      );
    }

    if (statusLines.length < 2 && staleDealsCount >= 1) {
      statusLines.push(
        `${staleDealsCount} deal${staleDealsCount > 1 ? "s" : ""} haven't had any activity in a few days.`
      );
    }

    if (statusLines.length < 2 && activeCampaign) {
      statusLines.push(`Your ${activeCampaign.name} campaign is running.`);
    }

    if (statusLines.length < 2 && isEstablished && recentContactCount === 0) {
      statusLines.push("Your contact list hasn't grown this week.");
    }

    // ── Chips (contextual, max 5) ─────────────────────────────────────────────
    const defaultChips = [
      { id: "add-contact",    label: "+ Add a contact",        prompt: "Add a new contact" },
      { id: "view-pipeline",  label: "View my pipeline",       prompt: "Show my pipeline" },
      { id: "generate-leads", label: "Generate leads",         prompt: "Help me generate leads" },
      { id: "create-task",    label: "Create a task",           prompt: "Create a task" },
      { id: "show-summary",   label: "Show me a summary",      prompt: "Give me a summary of my CRM" },
    ];

    // Build chips starting from defaults, then prepend contextual one if needed
    const promoted: typeof defaultChips = [];

    if (tasksDueCount >= 1) {
      promoted.push({ id: "review-tasks",    label: "Review my tasks",            prompt: "Show my tasks due today" });
    } else if (staleDealsCount >= 1) {
      promoted.push({ id: "follow-up-deals", label: "Follow up on deals",         prompt: "Show my stale deals" });
    } else if (activeCampaign) {
      promoted.push({ id: "check-campaign",  label: "Check campaign performance",  prompt: "Show my campaign performance" });
    }

    // Merge: promoted first, then defaults (deduped by id), capped at 5
    const seen = new Set<string>();
    const finalChips = [...promoted, ...defaultChips]
      .filter((c) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      })
      .slice(0, 5);

    return NextResponse.json({
      greeting,
      status_lines: statusLines,
      chips: finalChips,
    });
  } catch (error) {
    console.error("Welcome route error:", error);
    // Non-critical fallback — return a bare greeting so the UI still works
    return NextResponse.json({
      greeting: fallbackGreeting,
      status_lines: [],
      chips: [
        { id: "add-contact",    label: "+ Add a contact",   prompt: "Add a new contact" },
        { id: "view-pipeline",  label: "View my pipeline",  prompt: "Show my pipeline" },
        { id: "generate-leads", label: "Generate leads",    prompt: "Help me generate leads" },
        { id: "create-task",    label: "Create a task",      prompt: "Create a task" },
      ],
    });
  }
}
