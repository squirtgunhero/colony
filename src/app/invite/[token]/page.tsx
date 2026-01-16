"use client";

// ============================================================================
// Accept Invitation Page
// ============================================================================

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Users,
  Building2,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

interface InvitationData {
  email: string;
  role: string;
  status: string;
  isValid: boolean;
  team: {
    id: string;
    name: string;
    description: string | null;
  };
  invitedBy: {
    name: string | null;
    email: string | null;
    avatarUrl: string | null;
  };
  expiresAt: string;
  createdAt: string;
}

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const res = await fetch(`/api/teams/invite/accept?token=${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Invitation not found");
          return;
        }

        setInvitation(data.invitation);
      } catch (err) {
        setError("Failed to load invitation");
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchInvitation();
    }
  }, [token]);

  const handleAccept = async () => {
    setIsAccepting(true);

    try {
      const res = await fetch("/api/teams/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to accept invitation");
      }

      setSuccess(true);
      toast.success(data.message || "You've joined the team!");
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept invitation");
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12">
            <XCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Invitation</h2>
            <p className="text-muted-foreground text-center mb-6">
              {error || "This invitation is no longer valid."}
            </p>
            <Button onClick={() => router.push("/sign-in")}>
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Welcome to the Team!</h2>
            <p className="text-muted-foreground text-center mb-6">
              You&apos;ve successfully joined {invitation.team.name}.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation.isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12">
            <Clock className="h-12 w-12 text-amber-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invitation Expired</h2>
            <p className="text-muted-foreground text-center mb-6">
              This invitation to join {invitation.team.name} has{" "}
              {invitation.status === "accepted" ? "already been used" : "expired"}.
            </p>
            <Button onClick={() => router.push("/sign-in")}>
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const inviterInitials = invitation.invitedBy.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || invitation.invitedBy.email?.[0].toUpperCase() || "?";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            Join {invitation.team.name}
          </CardTitle>
          <CardDescription>
            {invitation.team.description || "You've been invited to collaborate on this team."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Invited by */}
          <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={invitation.invitedBy.avatarUrl || undefined} />
              <AvatarFallback>{inviterInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">Invited by</div>
              <div className="font-medium">
                {invitation.invitedBy.name || invitation.invitedBy.email}
              </div>
            </div>
          </div>

          {/* Role */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Your role</span>
            </div>
            <Badge variant="secondary" className="capitalize">
              {invitation.role}
            </Badge>
          </div>

          {/* Invitation email */}
          <div className="text-center text-sm text-muted-foreground">
            This invitation was sent to <strong>{invitation.email}</strong>
          </div>

          {/* Accept button */}
          <Button
            onClick={handleAccept}
            disabled={isAccepting}
            className="w-full"
            size="lg"
          >
            {isAccepting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Accept & Join Team
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By accepting, you&apos;ll get access to this team&apos;s CRM data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
