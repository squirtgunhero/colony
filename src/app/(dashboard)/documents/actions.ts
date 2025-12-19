"use server";

import { prisma } from "@/lib/prisma";
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
  const document = await prisma.document.create({
    data: {
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
  return prisma.document.findMany({
    where: { propertyId },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteDocument(id: string) {
  const doc = await prisma.document.findUnique({
    where: { id },
    select: { propertyId: true, dealId: true },
  });

  await prisma.document.delete({
    where: { id },
  });

  revalidatePath("/properties");
  if (doc?.propertyId) {
    revalidatePath(`/properties/${doc.propertyId}`);
  }
  if (doc?.dealId) {
    revalidatePath(`/deals/${doc.dealId}`);
  }
}

