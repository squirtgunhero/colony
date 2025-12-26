"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";

interface ContactData {
  name: string;
  email?: string;
  phone?: string;
  type: string;
  tags?: string[];
  source?: string;
  notes?: string;
}

interface PropertyData {
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  price?: number;
  status?: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  description?: string;
}

interface CreateContactWithPropertyData extends ContactData {
  property?: PropertyData;
}

export async function createContact(data: CreateContactWithPropertyData) {
  const userId = await requireUserId();
  
  // Create contact first
  const contact = await prisma.contact.create({
    data: {
      userId,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      type: data.type,
      tags: data.tags || [],
      source: data.source || null,
      notes: data.notes || null,
    },
  });

  // If property data is provided, create the property and link it to the contact
  if (data.property && data.property.address && data.property.city) {
    await prisma.property.create({
      data: {
        userId,
        address: data.property.address,
        city: data.property.city,
        state: data.property.state || null,
        zipCode: data.property.zipCode || null,
        price: data.property.price || 0,
        status: data.property.status || "listed",
        bedrooms: data.property.bedrooms || null,
        bathrooms: data.property.bathrooms || null,
        sqft: data.property.sqft || null,
        description: data.property.description || null,
        ownerId: contact.id,
      },
    });
  }

  revalidatePath("/contacts");
  revalidatePath("/properties");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return contact;
}

export async function updateContact(id: string, data: ContactData) {
  const userId = await requireUserId();
  
  // Only update if user owns the contact
  const contact = await prisma.contact.updateMany({
    where: { id, userId },
    data: {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      type: data.type,
      tags: data.tags || [],
      source: data.source || null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/contacts");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return contact;
}

export async function deleteContact(id: string) {
  const userId = await requireUserId();
  
  // Only delete if user owns the contact
  await prisma.contact.deleteMany({
    where: { id, userId },
  });

  revalidatePath("/contacts");
  revalidatePath("/dashboard");
}

