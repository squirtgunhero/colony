"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LogIn, UserPlus } from "lucide-react";

interface SignUpPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referralTitle?: string;
}

export function SignUpPrompt({
  open,
  onOpenChange,
  referralTitle,
}: SignUpPromptProps) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Join Colony to Claim Referrals</DialogTitle>
          <DialogDescription>
            {referralTitle
              ? `Sign up or log in to claim "${referralTitle}" and connect with the person who posted it.`
              : "Sign up or log in to claim referrals and grow your professional network."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          <p className="text-sm text-muted-foreground">
            Colony is a free platform where local professionals share and claim
            referral opportunities. Create an account to get started.
          </p>

          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => router.push("/sign-up")} className="w-full">
              <UserPlus className="h-4 w-4 mr-2" />
              Create Free Account
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/sign-in")}
              className="w-full"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground pt-2">
            After signing in, come back to this referral to claim it.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
