import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { ActionDefinition } from "./types";

const parameters = z.object({
  contactId: z.string().optional(),
  contactName: z.string().optional(),
  note: z.string().optional(),
  daysFromNow: z.number().int().min(1).max(365).default(1),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

export const scheduleFollowUp: ActionDefinition<typeof parameters> = {
  name: "scheduleFollowUp",
  description:
    "Schedule a follow-up task for a contact. Provide contactId or contactName, " +
    "an optional note, daysFromNow (default 1), and priority (default medium).",
  parameters,
  riskTier: 1,

  async execute(params, ctx) {
    let contactId = params.contactId;
    let contactLabel = "someone";

    if (!contactId && params.contactName) {
      const found = await prisma.contact.findFirst({
        where: {
          userId: ctx.profileId,
          name: { contains: params.contactName, mode: "insensitive" },
        },
        orderBy: { updatedAt: "desc" },
      });

      if (!found) {
        return {
          success: false,
          message: `Could not find a contact named "${params.contactName}".`,
        };
      }
      contactId = found.id;
      contactLabel = found.name;
    } else if (contactId) {
      const c = await prisma.contact.findUnique({ where: { id: contactId } });
      if (c) contactLabel = c.name;
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + params.daysFromNow);

    const title = `Follow up with ${contactLabel}`;
    const task = await prisma.task.create({
      data: {
        userId: ctx.profileId,
        title,
        description: params.note,
        dueDate,
        priority: params.priority,
        contactId,
        completed: false,
      },
    });

    const dateStr = dueDate.toLocaleDateString();
    return {
      success: true,
      message: `Scheduled follow-up with ${contactLabel} for ${dateStr}.`,
      data: task,
    };
  },
};
