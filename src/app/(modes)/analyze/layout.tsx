// ============================================
// COLONY - Analyze Mode Layout
// Dashboard-focused with full analytics
// ============================================

import { AnalyzeLayout } from "@/components/layout/AnalyzeLayout";

export default function AnalyzeModeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AnalyzeLayout>{children}</AnalyzeLayout>;
}
