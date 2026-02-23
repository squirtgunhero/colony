import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { PropertyDetailView } from "./property-detail-view";

interface PropertyPageProps {
  params: Promise<{ id: string }>;
}

async function getProperty(id: string, userId: string) {
  const property = await prisma.property.findFirst({
    where: { id, userId },
    include: {
      owner: true,
      documents: {
        orderBy: { createdAt: "desc" },
      },
      deals: {
        orderBy: { createdAt: "desc" },
        include: {
          contact: true,
        },
      },
      tasks: {
        where: { completed: false },
        orderBy: { dueDate: "asc" },
        take: 5,
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          contact: true,
        },
      },
    },
  });

  return property;
}

async function getContacts(userId: string) {
  return prisma.contact.findMany({
    where: { userId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { id } = await params;
  const userId = await requireUserId();
  const [property, contacts] = await Promise.all([
    getProperty(id, userId),
    getContacts(userId),
  ]);

  if (!property) {
    notFound();
  }

  const serialized = JSON.parse(JSON.stringify(property));

  return <PropertyDetailView property={serialized} contacts={contacts} />;
}
