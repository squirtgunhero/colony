import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { ActionDefinition } from "./types";

const parameters = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    patch: z.object({
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      source: z.string().optional(),
      type: z.enum(["lead", "client", "agent", "vendor"]).optional(),
      tags: z.array(z.string()).optional(),
      notes: z.string().optional(),
      isFavorite: z.boolean().optional(),
    }),
  })
  .refine((d) => d.id || d.name, {
    message: "Either id or name is required to identify the contact",
  });

export const updateContact: ActionDefinition<typeof parameters> = {
  name: "updateContact",
  description:
    "Update an existing contact. Identify the contact by id or name. " +
    "Provide a patch object with the fields to change: name, email, phone, source, type, tags, notes, isFavorite.",
  parameters,
  riskTier: 1,

  async execute(params, ctx) {
    let contactId = params.id;

    if (!contactId && params.name) {
      const found = await prisma.contact.findFirst({
        where: {
          userId: ctx.profileId,
          name: { contains: params.name, mode: "insensitive" },
        },
        orderBy: { updatedAt: "desc" },
      });

      if (!found) {
        return {
          success: false,
          message: `Could not find a contact named "${params.name}".`,
        };
      }
      contactId = found.id;
    }

    const before = await prisma.contact.findUnique({
      where: { id: contactId! },
    });

    if (!before) {
      return { success: false, message: `Contact not found.` };
    }

    if (before.userId !== ctx.profileId) {
      return { success: false, message: `Contact belongs to a different user.` };
    }

    const cleanPatch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params.patch)) {
      if (value !== undefined && value !== null) {
        cleanPatch[key] = value;
      }
    }

    const contact = await prisma.contact.update({
      where: { id: contactId! },
      data: { ...cleanPatch, updatedAt: new Date() },
    });

    const fields = Object.keys(cleanPatch).join(", ");
    return {
      success: true,
      message: `Updated ${contact.name} (${fields}).`,
      data: contact,
    };
  },
};
