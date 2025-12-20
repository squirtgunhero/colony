"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";

interface ContactData {
  name: string;
  email?: string;
  phone?: string;
  type: string;
  tags?: string[];
  source?: string;
  notes?: string;
}

export async function createContact(data: ContactData) {
  const userId = await requireUserId();
  
  const contact = await prisma.contact.create({
    data: {
      userId,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      type: data.type,
      tags: data.tags || [],
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
  const userId = await requireUserId();
  
  // Only update if user owns the contact
  const contact = await prisma.contact.updateMany({
    where: { id, userId },
    data: {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      type: data.type,
      tags: data.tags || [],
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
  const userId = await requireUserId();
  
  // Only delete if user owns the contact
  await prisma.contact.deleteMany({
    where: { id, userId },
  });

  revalidatePath("/contacts");
  revalidatePath("/dashboard");
}

