"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

export async function toggleContactFavorite(id: string) {
  const userId = await requireUserId();
  
  const contact = await prisma.contact.findFirst({
    where: { id, userId },
    select: { isFavorite: true },
  });

  if (!contact) {
    throw new Error("Contact not found");
  }

  await prisma.contact.updateMany({
    where: { id, userId },
    data: { isFavorite: !contact.isFavorite },
  });

  revalidatePath("/contacts");
  revalidatePath("/favorites");
  revalidatePath(`/contacts/${id}`);
}

export async function togglePropertyFavorite(id: string) {
  const userId = await requireUserId();
  
  const property = await prisma.property.findFirst({
    where: { id, userId },
    select: { isFavorite: true },
  });

  if (!property) {
    throw new Error("Property not found");
  }

  await prisma.property.updateMany({
    where: { id, userId },
    data: { isFavorite: !property.isFavorite },
  });

  revalidatePath("/properties");
  revalidatePath("/favorites");
  revalidatePath(`/properties/${id}`);
}

export async function toggleDealFavorite(id: string) {
  const userId = await requireUserId();
  
  const deal = await prisma.deal.findFirst({
    where: { id, userId },
    select: { isFavorite: true },
  });

  if (!deal) {
    throw new Error("Deal not found");
  }

  await prisma.deal.updateMany({
    where: { id, userId },
    data: { isFavorite: !deal.isFavorite },
  });

  revalidatePath("/deals");
  revalidatePath("/favorites");
  revalidatePath(`/deals/${id}`);
}

