"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface DealData {
  title: string;
  stage: string;
  value?: number;
  notes?: string;
  contactId?: string;
  propertyId?: string;
}

export async function createDeal(data: DealData) {
  const deal = await prisma.deal.create({
    data: {
      title: data.title,
      stage: data.stage,
      value: data.value || null,
      notes: data.notes || null,
      contactId: data.contactId || null,
      propertyId: data.propertyId || null,
    },
  });

  revalidatePath("/deals");
  revalidatePath("/dashboard");
  return deal;
}

export async function updateDeal(id: string, data: DealData) {
  const deal = await prisma.deal.update({
    where: { id },
    data: {
      title: data.title,
      stage: data.stage,
      value: data.value || null,
      notes: data.notes || null,
      contactId: data.contactId || null,
      propertyId: data.propertyId || null,
    },
  });

  revalidatePath("/deals");
  revalidatePath("/dashboard");
  return deal;
}

export async function updateDealStage(id: string, stage: string) {
  const deal = await prisma.deal.update({
    where: { id },
    data: { stage },
  });

  revalidatePath("/deals");
  revalidatePath("/dashboard");
  return deal;
}

export async function deleteDeal(id: string) {
  await prisma.deal.delete({
    where: { id },
  });

  revalidatePath("/deals");
  revalidatePath("/dashboard");
}

