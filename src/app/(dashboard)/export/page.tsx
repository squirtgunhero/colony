// HIDDEN: Phase 2 - /export removed from nav; still accessible via URL.
import { PageHeader } from "@/components/layout/page-header";
import { ExportCenter } from "@/components/export/export-center";
import { getExportStats } from "./actions";

export default async function ExportPage() {
  const stats = await getExportStats();

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Export Data"
        description="Download your CRM data as CSV files for backup or analysis."
      />

      <div className="p-4 sm:p-8">
        <ExportCenter stats={stats} />
      </div>
    </div>
  );
}

