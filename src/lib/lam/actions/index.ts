import { z } from "zod";
import type { ActionDefinition, ActionResult, LAMContext } from "./types";
import { createContact } from "./createContact";
import { updateContact } from "./updateContact";
import { searchContacts } from "./searchContacts";
import { createDeal } from "./createDeal";
import { updateDeal } from "./updateDeal";
import { searchDeals } from "./searchDeals";
import { createTask } from "./createTask";
import { completeTask } from "./completeTask";
import { getUpcomingTasks } from "./getUpcomingTasks";
import { getPipelineSummary } from "./getPipelineSummary";
import { scheduleFollowUp } from "./scheduleFollowUp";
import { sendSMSAction } from "./sendSMS";
import { setThemeAction } from "./setTheme";

export type { ActionDefinition, ActionResult, LAMContext } from "./types";

const registry: ActionDefinition[] = [
  createContact,
  updateContact,
  searchContacts,
  createDeal,
  updateDeal,
  searchDeals,
  createTask,
  completeTask,
  getUpcomingTasks,
  getPipelineSummary,
  scheduleFollowUp,
  sendSMSAction,
  setThemeAction,
];

const registryMap = new Map<string, ActionDefinition>(
  registry.map((a) => [a.name, a])
);

export function getActionRegistry(): ActionDefinition[] {
  return registry;
}

export function getActionDescriptions(): string {
  const riskLabels: Record<number, string> = {
    0: "read-only, auto-execute",
    1: "mutation with undo, auto-execute",
    2: "external communication, requires approval",
  };

  return registry
    .map((a) => `- ${a.name} (${riskLabels[a.riskTier]}): ${a.description}`)
    .join("\n");
}

export async function executeAction(
  name: string,
  params: unknown,
  context: LAMContext
): Promise<ActionResult> {
  const action = registryMap.get(name);
  if (!action) {
    return { success: false, message: `Unknown action: ${name}` };
  }

  const parsed = action.parameters.safeParse(params);
  if (!parsed.success) {
    const failResult = parsed as z.ZodSafeParseError<unknown>;
    const issues = failResult.error.issues
      .map((i) => `${String(i.path.join("."))}: ${i.message}`)
      .join("; ");
    return { success: false, message: `Invalid parameters: ${issues}` };
  }

  try {
    return await action.execute(parsed.data, context);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`Action ${name} failed:`, error);
    return { success: false, message: `Action failed: ${msg}` };
  }
}
