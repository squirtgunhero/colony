import { prisma } from "@/lib/prisma";

export interface SelectedScript {
  id: string;
  greeting: string;
  systemPrompt: string;
}

/**
 * Weighted random selection of a script variant for a given objective.
 * If no custom scripts exist, returns null (use defaults).
 */
export async function selectScript(
  userId: string,
  objective: string
): Promise<SelectedScript | null> {
  const scripts = await prisma.taraScript.findMany({
    where: { userId, objective, isActive: true },
  });

  if (scripts.length === 0) return null;

  // Weighted random selection
  const totalWeight = scripts.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight === 0) return null;

  let random = Math.random() * totalWeight;
  for (const script of scripts) {
    random -= script.weight;
    if (random <= 0) {
      return { id: script.id, greeting: script.greeting, systemPrompt: script.systemPrompt };
    }
  }

  // Fallback to first
  return { id: scripts[0].id, greeting: scripts[0].greeting, systemPrompt: scripts[0].systemPrompt };
}

/**
 * Update script performance metrics after a call completes.
 */
export async function updateScriptMetrics(scriptId: string, call: {
  connected: boolean;
  appointmentSet: boolean;
  duration: number;
}): Promise<void> {
  const script = await prisma.taraScript.findUnique({ where: { id: scriptId } });
  if (!script) return;

  const newTotal = script.totalCalls + 1;
  const newConnected = script.connectedCalls + (call.connected ? 1 : 0);
  const newAppts = script.appointmentsSet + (call.appointmentSet ? 1 : 0);
  const newAvgDuration = Math.round(
    (script.avgDuration * script.totalCalls + call.duration) / newTotal
  );

  await prisma.taraScript.update({
    where: { id: scriptId },
    data: {
      totalCalls: newTotal,
      connectedCalls: newConnected,
      appointmentsSet: newAppts,
      avgDuration: newAvgDuration,
    },
  });
}
