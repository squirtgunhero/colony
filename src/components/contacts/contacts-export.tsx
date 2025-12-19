"use client";

import { ExportButton } from "@/components/export/export-button";
import { exportContactsCSV } from "@/app/(dashboard)/export/actions";

export function ContactsExport() {
  return (
    <ExportButton
      onExport={exportContactsCSV}
      filename="contacts"
      label="Export"
    />
  );
}

