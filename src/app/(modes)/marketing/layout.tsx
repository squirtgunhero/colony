// ============================================
// COLONY - Marketing Mode Layout
// Marketing center for campaigns, content, email
// ============================================

import { MarketingLayout } from "@/components/layout/MarketingLayout";

export default function MarketingModeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MarketingLayout>{children}</MarketingLayout>;
}
