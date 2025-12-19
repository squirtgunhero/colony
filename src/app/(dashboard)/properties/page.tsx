import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { PropertiesGrid } from "@/components/properties/properties-grid";
import { PropertyDialog } from "@/components/properties/property-dialog";
import { PropertiesExport } from "@/components/properties/properties-export";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

async function getProperties() {
  return prisma.property.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      owner: true,
      _count: {
        select: {
          deals: true,
        },
      },
    },
  });
}

async function getContacts() {
  return prisma.contact.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export default async function PropertiesPage() {
  const [properties, contacts] = await Promise.all([
    getProperties(),
    getContacts(),
  ]);

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Properties"
        description="Manage your property listings and portfolio."
      >
        <div className="flex items-center gap-2">
          <PropertiesExport />
          <PropertyDialog contacts={contacts}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          </PropertyDialog>
        </div>
      </PageHeader>

      <div className="p-4 sm:p-8">
        <PropertiesGrid properties={properties} contacts={contacts} />
      </div>
    </div>
  );
}

