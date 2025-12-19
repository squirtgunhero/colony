"use client";

import { ExportButton } from "@/components/export/export-button";
import { exportPropertiesCSV } from "@/app/(dashboard)/export/actions";

export function PropertiesExport() {
  return (
    <ExportButton
      onExport={exportPropertiesCSV}
      filename="properties"
      label="Export"
    />
  );
}

