import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { AnalyticsDashboard } from "./analytics-dashboard";

export default async function DialerAnalyticsPage() {
  const userId = await requireUserId();

  const days = 7;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const calls = await prisma.call.findMany({
    where: {
      userId,
      createdAt: { gte: startDate },
    },
    select: {
      id: true,
      status: true,
      outcome: true,
      duration: true,
      isVoiceAI: true,
      appointmentSet: true,
      createdAt: true,
      contactId: true,
      contact: {
        select: { id: true, name: true, phone: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // --- Aggregate totals ---
  const totalCalls = calls.length;
  const connectedCalls = calls.filter(
    (c) => c.status === "completed" || c.status === "in_progress"
  ).length;
  const connectRate =
    totalCalls > 0 ? Math.round((connectedCalls / totalCalls) * 100) : 0;
  const totalDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);
  const avgDuration =
    connectedCalls > 0 ? Math.round(totalDuration / connectedCalls) : 0;
  const appointmentsSet = calls.filter((c) => c.appointmentSet).length;

  // --- AI vs Manual ---
  const aiCallsList = calls.filter((c) => c.isVoiceAI);
  const manualCallsList = calls.filter((c) => !c.isVoiceAI);
  const aiCalls = aiCallsList.length;
  const manualCalls = manualCallsList.length;

  const aiConnected = aiCallsList.filter(
    (c) => c.status === "completed" || c.status === "in_progress"
  ).length;
  const manualConnected = manualCallsList.filter(
    (c) => c.status === "completed" || c.status === "in_progress"
  ).length;

  const aiAvgDuration =
    aiConnected > 0
      ? Math.round(
          aiCallsList.reduce((s, c) => s + (c.duration || 0), 0) / aiConnected
        )
      : 0;
  const manualAvgDuration =
    manualConnected > 0
      ? Math.round(
          manualCallsList.reduce((s, c) => s + (c.duration || 0), 0) /
            manualConnected
        )
      : 0;

  const aiVsManual = {
    ai: {
      count: aiCalls,
      connectRate:
        aiCalls > 0 ? Math.round((aiConnected / aiCalls) * 100) : 0,
      avgDuration: aiAvgDuration,
    },
    manual: {
      count: manualCalls,
      connectRate:
        manualCalls > 0
          ? Math.round((manualConnected / manualCalls) * 100)
          : 0,
      avgDuration: manualAvgDuration,
    },
  };

  // --- Calls per day ---
  const callsByDay: Record<string, number> = {};
  for (let d = 0; d < days; d++) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    const key = date.toISOString().split("T")[0];
    callsByDay[key] = 0;
  }
  for (const call of calls) {
    const key = call.createdAt.toISOString().split("T")[0];
    if (callsByDay[key] !== undefined) {
      callsByDay[key]++;
    }
  }
  const callsPerDay = Object.entries(callsByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  // --- Outcome distribution ---
  const outcomeCounts: Record<string, number> = {};
  for (const call of calls) {
    const outcome = call.outcome || "no_outcome";
    outcomeCounts[outcome] = (outcomeCounts[outcome] || 0) + 1;
  }
  const outcomeDistribution = Object.entries(outcomeCounts)
    .map(([outcome, count]) => ({
      outcome,
      count,
      percentage: totalCalls > 0 ? Math.round((count / totalCalls) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // --- Hourly data ---
  const hourBuckets: Record<number, { total: number; connected: number }> = {};
  for (let h = 0; h < 24; h++) {
    hourBuckets[h] = { total: 0, connected: 0 };
  }
  for (const call of calls) {
    const hour = call.createdAt.getHours();
    hourBuckets[hour].total++;
    if (call.status === "completed" || call.status === "in_progress") {
      hourBuckets[hour].connected++;
    }
  }
  const hourlyData = Object.entries(hourBuckets)
    .map(([hour, d]) => ({
      hour: parseInt(hour),
      total: d.total,
      connected: d.connected,
      connectRate:
        d.total > 0 ? Math.round((d.connected / d.total) * 100) : 0,
    }))
    .filter((h) => h.hour >= 8 && h.hour <= 20);

  const bestHour = hourlyData.reduce(
    (best, h) => (h.connected > best.connected ? h : best),
    { hour: -1, total: 0, connected: 0, connectRate: 0 }
  );

  // --- Top contacts ---
  const contactMap: Record<
    string,
    {
      id: string;
      name: string;
      phone: string | null;
      callCount: number;
      lastOutcome: string | null;
      lastCallDate: string;
    }
  > = {};
  for (const call of calls) {
    if (!call.contact) continue;
    const cid = call.contact.id;
    if (!contactMap[cid]) {
      contactMap[cid] = {
        id: call.contact.id,
        name: call.contact.name,
        phone: call.contact.phone,
        callCount: 0,
        lastOutcome: null,
        lastCallDate: call.createdAt.toISOString(),
      };
    }
    contactMap[cid].callCount++;
    if (!contactMap[cid].lastOutcome && call.outcome) {
      contactMap[cid].lastOutcome = call.outcome;
      contactMap[cid].lastCallDate = call.createdAt.toISOString();
    }
  }
  const topContacts = Object.values(contactMap)
    .sort((a, b) => b.callCount - a.callCount)
    .slice(0, 10);

  const initialData = {
    totalCalls,
    connectedCalls,
    connectRate,
    avgDuration,
    appointmentsSet,
    aiVsManual,
    callsPerDay,
    outcomeDistribution,
    hourlyData,
    bestHour: bestHour.hour >= 0 ? bestHour : null,
    topContacts,
    days,
  };

  return <AnalyticsDashboard initialData={initialData} />;
}
