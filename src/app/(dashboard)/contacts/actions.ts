"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface ContactData {
  name: string;
  email?: string;
  phone?: string;
  type: string;
  source?: string;
  notes?: string;
}

export async function createContact(data: ContactData) {
  const contact = await prisma.contact.create({
    data: {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      type: data.type,
      source: data.source || null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/contacts");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return contact;
}

export async function updateContact(id: string, data: ContactData) {
  const contact = await prisma.contact.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      type: data.type,
      source: data.source || null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/contacts");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return contact;
}

export async function deleteContact(id: string) {
  await prisma.contact.delete({
    where: { id },
  });

  revalidatePath("/contacts");
  revalidatePath("/dashboard");
}

