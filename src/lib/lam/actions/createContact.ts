import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { ActionDefinition } from "./types";

const parameters = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  source: z.string().optional(),
  type: z.enum(["lead", "client", "agent", "vendor"]).default("lead"),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const createContact: ActionDefinition<typeof parameters> = {
  name: "createContact",
  description:
    "Create a new contact in the CRM. Requires a name. " +
    "Optionally include email, phone, source, type (lead/client/agent/vendor), tags, and notes.",
  parameters,
  riskTier: 1,

  async execute(params, ctx) {
    const contact = await prisma.contact.create({
      data: {
        userId: ctx.profileId,
        name: params.name,
        email: params.email,
        phone: params.phone,
        source: params.source,
        type: params.type,
        tags: params.tags ?? [],
        notes: params.notes,
      },
    });

    return {
      success: true,
      message: `Created contact "${contact.name}".`,
      data: contact,
    };
  },
};
