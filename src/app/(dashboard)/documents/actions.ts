"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";

interface CreateDocumentData {
  name: string;
  type: string;
  url: string;
  size?: number;
  propertyId?: string;
  dealId?: string;
}

export async function createDocument(data: CreateDocumentData) {
  const userId = await requireUserId();
  
  const document = await prisma.document.create({
    data: {
      userId,
      name: data.name,
      type: data.type,
      url: data.url,
      size: data.size || null,
      propertyId: data.propertyId || null,
      dealId: data.dealId || null,
    },
  });

  revalidatePath("/properties");
  if (data.propertyId) {
    revalidatePath(`/properties/${data.propertyId}`);
  }
  if (data.dealId) {
    revalidatePath(`/deals/${data.dealId}`);
  }

  return document;
}

export async function getPropertyDocuments(propertyId: string) {
  const userId = await requireUserId();
  
  return prisma.document.findMany({
    where: { userId, propertyId },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteDocument(id: string) {
  const userId = await requireUserId();
  
  const doc = await prisma.document.findFirst({
    where: { id, userId },
    select: { propertyId: true, dealId: true },
  });

  // Only delete if user owns the document
  await prisma.document.deleteMany({
    where: { id, userId },
  });

  revalidatePath("/properties");
  if (doc?.propertyId) {
    revalidatePath(`/properties/${doc.propertyId}`);
  }
  if (doc?.dealId) {
    revalidatePath(`/deals/${doc.dealId}`);
  }
}

