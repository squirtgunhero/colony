"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";

interface TaskData {
  title: string;
  description?: string;
  dueDate?: string;
  priority: string;
  contactId?: string;
  propertyId?: string;
  dealId?: string;
}

export async function createTask(data: TaskData) {
  const userId = await requireUserId();
  
  const task = await prisma.task.create({
    data: {
      userId,
      title: data.title,
      description: data.description || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      priority: data.priority,
      contactId: data.contactId || null,
      propertyId: data.propertyId || null,
      dealId: data.dealId || null,
    },
  });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/contacts");
  if (data.contactId) {
    revalidatePath(`/contacts/${data.contactId}`);
  }
  return task;
}

export async function updateTask(id: string, data: TaskData) {
  const userId = await requireUserId();
  
  // Only update if user owns the task
  const task = await prisma.task.updateMany({
    where: { id, userId },
    data: {
      title: data.title,
      description: data.description || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      priority: data.priority,
      contactId: data.contactId || null,
      propertyId: data.propertyId || null,
      dealId: data.dealId || null,
    },
  });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/contacts");
  if (data.contactId) {
    revalidatePath(`/contacts/${data.contactId}`);
  }
  return task;
}

export async function toggleTask(id: string, completed: boolean) {
  const userId = await requireUserId();
  
  // Get task first for contactId
  const existingTask = await prisma.task.findFirst({
    where: { id, userId },
    select: { contactId: true },
  });
  
  // Only toggle if user owns the task
  const task = await prisma.task.updateMany({
    where: { id, userId },
    data: { completed },
  });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/contacts");
  if (existingTask?.contactId) {
    revalidatePath(`/contacts/${existingTask.contactId}`);
  }
  return task;
}

export async function deleteTask(id: string) {
  const userId = await requireUserId();
  
  // Get task first for contactId
  const existingTask = await prisma.task.findFirst({
    where: { id, userId },
    select: { contactId: true },
  });
  
  // Only delete if user owns the task
  await prisma.task.deleteMany({
    where: { id, userId },
  });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/contacts");
  if (existingTask?.contactId) {
    revalidatePath(`/contacts/${existingTask.contactId}`);
  }
}

