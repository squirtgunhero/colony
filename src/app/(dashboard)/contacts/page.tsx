import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { ContactDialog } from "@/components/contacts/contact-dialog";
import { ContactsExport } from "@/components/contacts/contacts-export";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

async function getContacts() {
  return prisma.contact.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          properties: true,
          deals: true,
          tasks: true,
        },
      },
    },
  });
}

export default async function ContactsPage() {
  const contacts = await getContacts();

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Contacts"
        description="Manage your leads, clients, agents, and vendors."
      >
        <div className="flex items-center gap-2">
          <ContactsExport />
          <ContactDialog>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </ContactDialog>
        </div>
      </PageHeader>

      <div className="p-4 sm:p-8">
        <ContactsTable contacts={contacts} />
      </div>
    </div>
  );
}

