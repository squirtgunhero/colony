import { Suspense } from "react";
import { requireUserId } from "@/lib/supabase/auth";
import { PageHeader } from "@/components/layout/page-header";
import { ReferralFilters } from "@/components/referrals/referral-filters";
import { ReferralFeed } from "@/components/referrals/referral-feed";
import { CreateReferralDialog } from "@/components/referrals/create-referral-dialog";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";

export default async function ReferralsPage() {
  await requireUserId();

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Referrals"
        description="Share and discover referral opportunities. Claim leads and grow your network."
      >
        <CreateReferralDialog>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Post Referral
          </Button>
        </CreateReferralDialog>
      </PageHeader>

      <div className="p-4 sm:p-8 space-y-6">
        <Suspense fallback={null}>
          <ReferralFilters />
        </Suspense>

        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <ReferralFeed />
        </Suspense>
      </div>
    </div>
  );
}

