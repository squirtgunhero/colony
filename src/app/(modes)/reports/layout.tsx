import { BrowseLayout } from "@/components/layout/BrowseLayout";

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BrowseLayout>{children}</BrowseLayout>;
}
