import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ContactDetailView } from "./contact-detail-view";

interface ContactPageProps {
  params: Promise<{ id: string }>;
}

async function getContact(id: string) {
  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      activities: {
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          deal: true,
          property: true,
        },
      },
      deals: {
        orderBy: { createdAt: "desc" },
        include: {
          property: true,
        },
      },
      properties: {
        orderBy: { createdAt: "desc" },
      },
      tasks: {
        orderBy: [
          { completed: "asc" },
          { dueDate: "asc" },
        ],
      },
    },
  });

  return contact;
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { id } = await params;
  const contact = await getContact(id);

  if (!contact) {
    notFound();
  }

  const serialized = JSON.parse(JSON.stringify(contact));

  return <ContactDetailView contact={serialized} />;
}
