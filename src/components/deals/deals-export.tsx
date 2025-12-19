"use client";

import { ExportButton } from "@/components/export/export-button";
import { exportDealsCSV } from "@/app/(dashboard)/export/actions";

export function DealsExport() {
  return (
    <ExportButton
      onExport={exportDealsCSV}
      filename="deals"
      label="Export"
    />
  );
}

