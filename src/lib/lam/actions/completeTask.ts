import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { ActionDefinition } from "./types";

const parameters = z
  .object({
    id: z.string().optional(),
    title: z.string().optional(),
  })
  .refine((d) => d.id || d.title, {
    message: "Either id or title is required to identify the task",
  });

export const completeTask: ActionDefinition<typeof parameters> = {
  name: "completeTask",
  description:
    "Mark a task as complete. Identify the task by id or title.",
  parameters,
  riskTier: 1,

  async execute(params, ctx) {
    let taskId = params.id;

    if (!taskId && params.title) {
      const found = await prisma.task.findFirst({
        where: {
          userId: ctx.profileId,
          title: { contains: params.title, mode: "insensitive" },
          completed: false,
        },
        orderBy: { updatedAt: "desc" },
      });

      if (!found) {
        return {
          success: false,
          message: `Could not find an open task titled "${params.title}".`,
        };
      }
      taskId = found.id;
    }

    const task = await prisma.task.findUnique({ where: { id: taskId! } });
    if (!task) {
      return { success: false, message: "Task not found." };
    }

    if (task.userId !== ctx.profileId) {
      return { success: false, message: "Task belongs to a different user." };
    }

    if (task.completed) {
      return {
        success: true,
        message: `"${task.title}" was already completed.`,
        data: task,
      };
    }

    const updated = await prisma.task.update({
      where: { id: taskId! },
      data: { completed: true, updatedAt: new Date() },
    });

    return {
      success: true,
      message: `Completed task "${updated.title}".`,
      data: updated,
    };
  },
};
