// ============================================
// COLONY - Browse Mode Layout
// Lists and detail pages for CRM entities
// ============================================

import { BrowseLayout } from "@/components/layout/BrowseLayout";

export default function BrowseModeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BrowseLayout>{children}</BrowseLayout>;
}
