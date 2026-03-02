import { getUser } from "@/lib/supabase/auth";
import { MarketplaceShell } from "@/components/marketplace/marketplace-shell";

export default async function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return <MarketplaceShell isLoggedIn={!!user}>{children}</MarketplaceShell>;
}
