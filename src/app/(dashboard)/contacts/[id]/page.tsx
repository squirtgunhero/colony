import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ContactDetailView } from "./contact-detail-view";
import { requireUser } from "@/lib/supabase/auth";

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

  // Determine last contacted date from activities
  const lastContactedDate = contact.activities[0]?.createdAt
    ? new Date(contact.activities[0].createdAt).toISOString()
    : null;

  // Get current user for presence
  const currentUser = await requireUser();
  const currentUserMeta = {
    name: currentUser.user_metadata?.full_name || currentUser.email || "You",
    avatar: currentUser.user_metadata?.avatar_url || null,
  };

  const serialized = JSON.parse(JSON.stringify(contact));

  return (
    <ContactDetailView
      contact={serialized}
      relationshipScore={undefined}
      lastContactedDate={lastContactedDate}
    />
  );
}
