import { prisma } from "@/lib/prisma";

export interface SiteContext {
  agent: {
    name: string | null;
    email: string | null;
    phone: string | null;
    company: string | null;
  };
  properties: {
    address: string | null;
    city: string | null;
    state: string | null;
    price: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    sqft: number | null;
    imageUrl: string | null;
    description: string | null;
    status: string | null;
  }[];
}

export async function loadSiteContext(userId: string): Promise<SiteContext> {
  const [profile, properties] = await Promise.all([
    prisma.profile.findUnique({
      where: { id: userId },
      include: { phone: true },
    }),
    prisma.property.findMany({
      where: { userId },
      take: 12,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return {
    agent: {
      name: profile?.fullName ?? null,
      email: profile?.email ?? null,
      phone: profile?.phone?.phoneNumber ?? null,
      company: profile?.businessType ?? null,
    },
    properties: properties.map((p) => ({
      address: p.address,
      city: p.city,
      state: p.state,
      price: p.price ? Number(p.price) : null,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms ? Number(p.bathrooms) : null,
      sqft: p.sqft,
      imageUrl: p.imageUrl,
      description: p.description,
      status: p.status,
    })),
  };
}
