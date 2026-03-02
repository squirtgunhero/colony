"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClaimDialog } from "@/components/referrals/claim-dialog";
import { SignUpPrompt } from "@/components/marketplace/sign-up-prompt";

interface ClaimRedirectProps {
  referralId: string;
  referralTitle: string;
  isLoggedIn: boolean;
  hasUserClaimed: boolean;
}

export function ClaimRedirect({
  referralId,
  referralTitle,
  isLoggedIn,
  hasUserClaimed,
}: ClaimRedirectProps) {
  const searchParams = useSearchParams();
  const [showSignUp, setShowSignUp] = useState(false);
  const shouldAutoOpen =
    searchParams.get("claim") === "true" && isLoggedIn && !hasUserClaimed;

  useEffect(() => {
    if (searchParams.get("claim") === "true" && !isLoggedIn) {
      setShowSignUp(true);
    }

    if (searchParams.get("claim") === "true") {
      const url = new URL(window.location.href);
      url.searchParams.delete("claim");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, isLoggedIn]);

  return (
    <>
      {shouldAutoOpen && (
        <ClaimDialog
          referralId={referralId}
          referralTitle={referralTitle}
          defaultOpen
        />
      )}
      <SignUpPrompt
        open={showSignUp}
        onOpenChange={setShowSignUp}
        referralTitle={referralTitle}
      />
    </>
  );
}
