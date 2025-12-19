"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type ActivityType = "call" | "email" | "meeting" | "note" | "task_completed" | "deal_update";

interface CreateActivityData {
  type: ActivityType;
  title: string;
  description?: string;
  metadata?: string;
  contactId?: string;
  dealId?: string;
  propertyId?: string;
}

export async function createActivity(data: CreateActivityData) {
  const activity = await prisma.activity.create({
    data: {
      type: data.type,
      title: data.title,
      description: data.description || null,
      metadata: data.metadata || null,
      contactId: data.contactId || null,
      dealId: data.dealId || null,
      propertyId: data.propertyId || null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/contacts");
  if (data.contactId) {
    revalidatePath(`/contacts/${data.contactId}`);
  }

  return activity;
}

export async function getContactActivities(contactId: string) {
  return prisma.activity.findMany({
    where: { contactId },
    orderBy: { createdAt: "desc" },
    include: {
      deal: true,
      property: true,
    },
  });
}

export async function getRecentActivities(limit: number = 10) {
  return prisma.activity.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      contact: true,
      deal: true,
      property: true,
    },
  });
}

export async function deleteActivity(id: string) {
  await prisma.activity.delete({
    where: { id },
  });

  revalidatePath("/dashboard");
  revalidatePath("/contacts");
}

