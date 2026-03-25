import { BrowseLayout } from "@/components/layout/BrowseLayout";

export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BrowseLayout>{children}</BrowseLayout>;
}
