import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { ActionDefinition } from "./types";

const parameters = z.object({
  days: z.number().int().min(1).max(90).default(7),
  limit: z.number().int().min(1).max(50).default(10),
});

export const getUpcomingTasks: ActionDefinition<typeof parameters> = {
  name: "getUpcomingTasks",
  description:
    "Get upcoming incomplete tasks for the next N days (default 7). Returns tasks sorted by due date.",
  parameters,
  riskTier: 0,

  async execute(params, ctx) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + params.days);

    const tasks = await prisma.task.findMany({
      where: {
        userId: ctx.profileId,
        completed: false,
        dueDate: { lte: cutoff },
      },
      orderBy: { dueDate: "asc" },
      take: params.limit,
    });

    if (tasks.length === 0) {
      return {
        success: true,
        message: `No upcoming tasks in the next ${params.days} days.`,
        data: [],
      };
    }

    const lines = tasks.map((t) => {
      const due = t.dueDate
        ? t.dueDate.toLocaleDateString()
        : "no due date";
      return `• ${t.title} (${due}, ${t.priority})`;
    });

    return {
      success: true,
      message: `${tasks.length} upcoming task(s):\n${lines.join("\n")}`,
      data: tasks,
    };
  },
};
