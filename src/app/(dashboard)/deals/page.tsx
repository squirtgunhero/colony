import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { DealsBoard } from "@/components/deals/deals-board";
import { DealDialog } from "@/components/deals/deal-dialog";
import { DealsExport } from "@/components/deals/deals-export";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

async function getDeals() {
  return prisma.deal.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      contact: true,
      property: true,
    },
  });
}

async function getContacts() {
  return prisma.contact.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

async function getProperties() {
  return prisma.property.findMany({
    select: { id: true, address: true, city: true },
    orderBy: { address: "asc" },
  });
}

export default async function DealsPage() {
  const [deals, contacts, properties] = await Promise.all([
    getDeals(),
    getContacts(),
    getProperties(),
  ]);

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Deals Pipeline"
        description="Track your deals through each stage of the sales process."
      >
        <div className="flex items-center gap-2">
          <DealsExport />
          <DealDialog contacts={contacts} properties={properties}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Deal
            </Button>
          </DealDialog>
        </div>
      </PageHeader>

      <div className="p-4 sm:p-8">
        <DealsBoard deals={deals} contacts={contacts} properties={properties} />
      </div>
    </div>
  );
}

