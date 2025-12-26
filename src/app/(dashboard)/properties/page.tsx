import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { PageHeader } from "@/components/layout/page-header";
import { PropertiesGrid } from "@/components/properties/properties-grid";
import { PropertiesExport } from "@/components/properties/properties-export";

async function getProperties(userId: string) {
  return prisma.property.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      owner: true,
    },
  });
}

export default async function PropertiesPage() {
  const userId = await requireUserId();
  const properties = await getProperties(userId);

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Properties"
        description="Manage your property listings and portfolio."
      >
        <PropertiesExport />
      </PageHeader>

      <div className="p-4 sm:p-8">
        <PropertiesGrid properties={properties} />
      </div>
    </div>
  );
}
