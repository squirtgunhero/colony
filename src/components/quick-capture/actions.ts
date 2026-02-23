"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";

export async function createQuickNote({ text, contactId }: { text: string; contactId?: string }) {
  const userId = await requireUserId();

  await prisma.activity.create({
    data: {
      userId,
      type: "note",
      title: "Quick note",
      description: text,
      contactId: contactId || null,
    },
  });

  revalidatePath("/contacts");
  revalidatePath("/browse/contacts");
}

export async function createQuickCall({
  contactName,
  durationMinutes,
  notes,
}: {
  contactName: string;
  durationMinutes: number;
  notes?: string;
}) {
  const userId = await requireUserId();

  // Try to find the contact by name
  const contact = await prisma.contact.findFirst({
    where: {
      userId,
      name: { contains: contactName, mode: "insensitive" },
    },
    select: { id: true, name: true },
  });

  await prisma.activity.create({
    data: {
      userId,
      type: "call",
      title: `Call with ${contact?.name ?? contactName}`,
      description: notes || null,
      metadata: JSON.stringify({ durationMinutes }),
      contactId: contact?.id || null,
    },
  });

  revalidatePath("/contacts");
  revalidatePath("/browse/contacts");
  if (contact?.id) {
    revalidatePath(`/contacts/${contact.id}`);
  }
}
