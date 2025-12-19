"use server";

import { prisma } from "@/lib/prisma";
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
  const task = await prisma.task.create({
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
  return task;
}

export async function updateTask(id: string, data: TaskData) {
  const task = await prisma.task.update({
    where: { id },
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
  return task;
}

export async function toggleTask(id: string, completed: boolean) {
  const task = await prisma.task.update({
    where: { id },
    data: { completed },
  });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return task;
}

export async function deleteTask(id: string) {
  await prisma.task.delete({
    where: { id },
  });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

