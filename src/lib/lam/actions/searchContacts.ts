import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { ActionDefinition } from "./types";

const parameters = z.object({
  query: z.string().min(1),
  type: z.enum(["lead", "client", "agent", "vendor"]).optional(),
  source: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

export const searchContacts: ActionDefinition<typeof parameters> = {
  name: "searchContacts",
  description:
    "Search contacts by name, email, or phone number. " +
    "Optionally filter by type (lead, client, agent, vendor) or source.",
  parameters,
  riskTier: 0,

  async execute(params, ctx) {
    const contacts = await prisma.contact.findMany({
      where: {
        userId: ctx.profileId,
        OR: [
          { name: { contains: params.query, mode: "insensitive" } },
          { email: { contains: params.query, mode: "insensitive" } },
          { phone: { contains: params.query, mode: "insensitive" } },
        ],
        ...(params.type ? { type: params.type } : {}),
        ...(params.source ? { source: params.source } : {}),
      },
      take: params.limit,
      orderBy: { updatedAt: "desc" },
    });

    if (contacts.length === 0) {
      return {
        success: true,
        message: `No contacts found for "${params.query}".`,
        data: [],
      };
    }

    const summary = contacts
      .map((c) => `${c.name}${c.email ? ` (${c.email})` : ""}`)
      .join(", ");

    return {
      success: true,
      message: `Found ${contacts.length} contact(s): ${summary}.`,
      data: contacts,
    };
  },
};
