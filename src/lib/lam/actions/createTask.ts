import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { ActionDefinition } from "./types";

const parameters = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  propertyId: z.string().optional(),
});

export const createTask: ActionDefinition<typeof parameters> = {
  name: "createTask",
  description:
    "Create a new task. Requires a title. " +
    "Optionally include description, dueDate, priority (low/medium/high), contactId, dealId, or propertyId.",
  parameters,
  riskTier: 1,

  async execute(params, ctx) {
    const task = await prisma.task.create({
      data: {
        userId: ctx.profileId,
        title: params.title,
        description: params.description,
        dueDate: params.dueDate ? new Date(params.dueDate) : null,
        priority: params.priority,
        contactId: params.contactId,
        dealId: params.dealId,
        propertyId: params.propertyId,
        completed: false,
      },
    });

    const duePart = task.dueDate
      ? ` due ${task.dueDate.toLocaleDateString()}`
      : "";

    return {
      success: true,
      message: `Created task "${task.title}"${duePart}.`,
      data: task,
    };
  },
};
