"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
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
  const userId = await requireUserId();
  
  const deal = await prisma.deal.create({
    data: {
      userId,
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
  const userId = await requireUserId();
  
  // Only update if user owns the deal
  const deal = await prisma.deal.updateMany({
    where: { id, userId },
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
  const userId = await requireUserId();
  
  // Only update if user owns the deal
  const deal = await prisma.deal.updateMany({
    where: { id, userId },
    data: { stage },
  });

  revalidatePath("/deals");
  revalidatePath("/dashboard");
  return deal;
}

export async function deleteDeal(id: string) {
  const userId = await requireUserId();
  
  // Only delete if user owns the deal
  await prisma.deal.deleteMany({
    where: { id, userId },
  });

  revalidatePath("/deals");
  revalidatePath("/dashboard");
}

