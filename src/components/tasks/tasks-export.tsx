"use client";

import { ExportButton } from "@/components/export/export-button";
import { exportTasksCSV } from "@/app/(dashboard)/export/actions";

export function TasksExport() {
  return (
    <ExportButton
      onExport={exportTasksCSV}
      filename="tasks"
      label="Export"
    />
  );
}

