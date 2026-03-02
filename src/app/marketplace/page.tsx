import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/auth";
import { MarketplaceContent } from "@/components/marketplace/marketplace-content";

export const metadata: Metadata = {
  title: "Referral Marketplace | Colony",
  description:
    "Browse open referral opportunities from local professionals. Claim a referral, close a deal, grow your network.",
  openGraph: {
    title: "Referral Marketplace | Colony",
    description:
      "Browse open referral opportunities from local professionals. Claim a referral, close a deal, grow your network.",
    type: "website",
  },
};

export default async function MarketplacePage() {
  const user = await getUser();

  return <MarketplaceContent isLoggedIn={!!user} />;
}
