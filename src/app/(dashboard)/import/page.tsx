import { PageHeader } from "@/components/layout/page-header";
import { ImportCenter } from "@/components/import/import-center";
import { getImportStats } from "./actions";

export default async function ImportPage() {
  const stats = await getImportStats();

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Import Contacts"
        description="Upload a CSV or paste data to bulk-import contacts into your CRM."
      />

      <div className="p-4 sm:p-8">
        <ImportCenter existingContactCount={stats.total} />
      </div>
    </div>
  );
}
