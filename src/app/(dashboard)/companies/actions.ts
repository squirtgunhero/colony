"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";

interface CompanyData {
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
  logoUrl?: string;
}

export async function createCompany(data: CompanyData) {
  const userId = await requireUserId();

  const company = await prisma.company.create({
    data: {
      userId,
      name: data.name,
      domain: data.domain || null,
      industry: data.industry || null,
      size: data.size || null,
      phone: data.phone || null,
      email: data.email || null,
      website: data.website || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zipCode: data.zipCode || null,
      notes: data.notes || null,
      logoUrl: data.logoUrl || null,
    },
  });

  revalidatePath("/browse/companies");
  revalidatePath("/dashboard");
  return company;
}

export async function updateCompany(id: string, data: Partial<CompanyData>) {
  const userId = await requireUserId();

  const company = await prisma.company.updateMany({
    where: { id, userId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.domain !== undefined && { domain: data.domain || null }),
      ...(data.industry !== undefined && { industry: data.industry || null }),
      ...(data.size !== undefined && { size: data.size || null }),
      ...(data.phone !== undefined && { phone: data.phone || null }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.website !== undefined && { website: data.website || null }),
      ...(data.address !== undefined && { address: data.address || null }),
      ...(data.city !== undefined && { city: data.city || null }),
      ...(data.state !== undefined && { state: data.state || null }),
      ...(data.zipCode !== undefined && { zipCode: data.zipCode || null }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
      ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl || null }),
    },
  });

  revalidatePath("/browse/companies");
  revalidatePath(`/companies/${id}`);
  revalidatePath("/dashboard");
  return company;
}

export async function deleteCompany(id: string) {
  const userId = await requireUserId();

  await prisma.company.deleteMany({
    where: { id, userId },
  });

  revalidatePath("/browse/companies");
  revalidatePath("/dashboard");
}

export async function linkContactToCompany(contactId: string, companyId: string) {
  const userId = await requireUserId();

  // Verify ownership of both records
  const contact = await prisma.contact.findFirst({ where: { id: contactId, userId } });
  const company = await prisma.company.findFirst({ where: { id: companyId, userId } });
  if (!contact || !company) throw new Error("Not found");

  await prisma.contact.update({
    where: { id: contactId },
    data: { companyId },
  });

  revalidatePath("/browse/companies");
  revalidatePath(`/companies/${companyId}`);
  revalidatePath(`/contacts/${contactId}`);
}

export async function unlinkContactFromCompany(contactId: string) {
  const userId = await requireUserId();

  const contact = await prisma.contact.findFirst({ where: { id: contactId, userId } });
  if (!contact) throw new Error("Not found");

  await prisma.contact.update({
    where: { id: contactId },
    data: { companyId: null },
  });

  revalidatePath("/browse/companies");
  revalidatePath(`/contacts/${contactId}`);
}
