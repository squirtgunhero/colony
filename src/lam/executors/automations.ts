// Automation Domain Executors — Create and list workflow automations
import { prisma } from "@/lib/prisma";
import type { ActionExecutor } from "../types";

export const automationExecutors: Record<string, ActionExecutor> = {
  "automation.create": async (action, ctx) => {
    if (action.type !== "automation.create")
      throw new Error("Invalid action type");

    const { name, trigger, action: automationAction } = action.payload as {
      name: string;
      trigger: { type: string; conditions?: Record<string, unknown> };
      action: { type: string; params: Record<string, unknown> };
    };

    const automation = await prisma.automation.create({
      data: {
        userId: ctx.user_id,
        name,
        trigger: JSON.parse(JSON.stringify(trigger)),
        action: JSON.parse(JSON.stringify(automationAction)),
      },
    });

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success" as const,
      data: {
        automationId: automation.id,
        name: automation.name,
        message: `Automation "${name}" created — it will fire when ${trigger.type} occurs`,
      },
    };
  },

  "automation.list": async (action, ctx) => {
    if (action.type !== "automation.list")
      throw new Error("Invalid action type");

    const { activeOnly } = action.payload as { activeOnly?: boolean };

    const automations = await prisma.automation.findMany({
      where: {
        userId: ctx.user_id,
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success" as const,
      data: {
        automations: automations.map((a) => ({
          id: a.id,
          name: a.name,
          trigger: a.trigger,
          action: a.action,
          isActive: a.isActive,
          fireCount: a.fireCount,
          lastFiredAt: a.lastFiredAt,
        })),
        total: automations.length,
        message:
          automations.length === 0
            ? "No automations set up yet"
            : `Found ${automations.length} automation(s)`,
      },
    };
  },
};
