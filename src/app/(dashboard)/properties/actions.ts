"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";

interface ContactData {
  name?: string;
  email?: string;
  phone?: string;
  type?: string;
}

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

interface CreatePropertyWithContactData extends PropertyData {
  newContact?: ContactData;
}

export async function createProperty(data: CreatePropertyWithContactData) {
  const userId = await requireUserId();
  
  let ownerId = data.ownerId || null;
  
  // If new contact data is provided, create the contact first
  if (data.newContact && data.newContact.name) {
    const contact = await prisma.contact.create({
      data: {
        userId,
        name: data.newContact.name,
        email: data.newContact.email || null,
        phone: data.newContact.phone || null,
        type: data.newContact.type || "client",
      },
    });
    ownerId = contact.id;
  }
  
  const property = await prisma.property.create({
    data: {
      userId,
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
      ownerId,
    },
  });

  revalidatePath("/properties");
  revalidatePath("/contacts");
  revalidatePath("/dashboard");
  return property;
}

export async function updateProperty(id: string, data: PropertyData) {
  const userId = await requireUserId();
  
  // Only update if user owns the property
  const property = await prisma.property.updateMany({
    where: { id, userId },
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
  const userId = await requireUserId();
  
  // Only delete if user owns the property
  await prisma.property.deleteMany({
    where: { id, userId },
  });

  revalidatePath("/properties");
  revalidatePath("/dashboard");
}

