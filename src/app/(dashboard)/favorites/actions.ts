"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function toggleContactFavorite(id: string) {
  const contact = await prisma.contact.findUnique({
    where: { id },
    select: { isFavorite: true },
  });

  if (!contact) {
    throw new Error("Contact not found");
  }

  await prisma.contact.update({
    where: { id },
    data: { isFavorite: !contact.isFavorite },
  });

  revalidatePath("/contacts");
  revalidatePath("/favorites");
  revalidatePath(`/contacts/${id}`);
}

export async function togglePropertyFavorite(id: string) {
  const property = await prisma.property.findUnique({
    where: { id },
    select: { isFavorite: true },
  });

  if (!property) {
    throw new Error("Property not found");
  }

  await prisma.property.update({
    where: { id },
    data: { isFavorite: !property.isFavorite },
  });

  revalidatePath("/properties");
  revalidatePath("/favorites");
  revalidatePath(`/properties/${id}`);
}

export async function toggleDealFavorite(id: string) {
  const deal = await prisma.deal.findUnique({
    where: { id },
    select: { isFavorite: true },
  });

  if (!deal) {
    throw new Error("Deal not found");
  }

  await prisma.deal.update({
    where: { id },
    data: { isFavorite: !deal.isFavorite },
  });

  revalidatePath("/deals");
  revalidatePath("/favorites");
  revalidatePath(`/deals/${id}`);
}

