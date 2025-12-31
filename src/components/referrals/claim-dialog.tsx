"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Hand } from "lucide-react";

interface ClaimDialogProps {
  referralId: string;
  referralTitle: string;
  children: React.ReactNode;
}

export function ClaimDialog({ referralId, referralTitle, children }: ClaimDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleClaim = async () => {
    setLoading(true);

    try {
      const response = await fetch(`/api/referrals/${referralId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() || undefined }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to claim referral");
      }

      toast.success("Claim submitted! The creator will review your request.");
      setOpen(false);
      setMessage("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to claim referral");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hand className="h-5 w-5 text-primary" />
            Claim This Referral
          </DialogTitle>
          <DialogDescription>
            You're claiming: <span className="font-medium text-foreground">{referralTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            When you claim a referral, the creator will be notified and can accept or reject your claim. 
            If accepted, you'll become a participant and can communicate privately with the creator.
          </p>

          <div className="space-y-2">
            <Label htmlFor="claimMessage">Message (optional)</Label>
            <Textarea
              id="claimMessage"
              placeholder="Introduce yourself or explain why you're a good fit for this referral..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              This message will be visible to the referral creator.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleClaim} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Claim
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

