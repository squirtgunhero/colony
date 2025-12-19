"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface PropertyData {
  address: string;
  city: string;
  state?: string;
  zipCode?: string;
  price: number;
  status: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  description?: string;
  ownerId?: string;
}

export async function createProperty(data: PropertyData) {
  const property = await prisma.property.create({
    data: {
      address: data.address,
      city: data.city,
      state: data.state || null,
      zipCode: data.zipCode || null,
      price: data.price,
      status: data.status,
      bedrooms: data.bedrooms || null,
      bathrooms: data.bathrooms || null,
      sqft: data.sqft || null,
      description: data.description || null,
      ownerId: data.ownerId || null,
    },
  });

  revalidatePath("/properties");
  revalidatePath("/dashboard");
  return property;
}

export async function updateProperty(id: string, data: PropertyData) {
  const property = await prisma.property.update({
    where: { id },
    data: {
      address: data.address,
      city: data.city,
      state: data.state || null,
      zipCode: data.zipCode || null,
      price: data.price,
      status: data.status,
      bedrooms: data.bedrooms || null,
      bathrooms: data.bathrooms || null,
      sqft: data.sqft || null,
      description: data.description || null,
      ownerId: data.ownerId || null,
    },
  });

  revalidatePath("/properties");
  revalidatePath("/dashboard");
  return property;
}

export async function deleteProperty(id: string) {
  await prisma.property.delete({
    where: { id },
  });

  revalidatePath("/properties");
  revalidatePath("/dashboard");
}

