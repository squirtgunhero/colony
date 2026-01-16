"use client";

// ============================================================================
// Team Settings Page
// ============================================================================

import { useState } from "react";
import { useTeamStore } from "@/lib/team/store";
import { TeamMembersList } from "@/components/team/TeamMembersList";
import { InviteMemberModal } from "@/components/team/InviteMemberModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserPlus,
  Settings,
  Building2,
  Mail,
  Clock,
} from "lucide-react";

export default function TeamSettingsPage() {
  const { currentTeam } = useTeamStore();
  const [showInviteModal, setShowInviteModal] = useState(false);

  if (!currentTeam) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Team Selected</h2>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              You&apos;re currently in your personal workspace. Switch to a team using the team switcher in the sidebar, or create a new team.
            </p>
            <Button onClick={() => window.location.href = "/settings"}>
              Go to Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Team Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">{currentTeam.name}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">{currentTeam.role}</Badge>
                <span>·</span>
                <span>{currentTeam.memberCount} member{currentTeam.memberCount !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>
          {currentTeam.description && (
            <p className="text-muted-foreground mt-2">{currentTeam.description}</p>
          )}
        </div>

        <Button onClick={() => setShowInviteModal(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="invitations" className="gap-2">
            <Mail className="h-4 w-4" />
            Invitations
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                People who have access to this team&apos;s CRM data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TeamMembersList teamId={currentTeam.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations">
          <PendingInvitations teamId={currentTeam.id} />
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Team Settings</CardTitle>
              <CardDescription>
                Manage your team&apos;s settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Team settings coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <InviteMemberModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        teamId={currentTeam.id}
      />
    </div>
  );
}

// Pending Invitations Component
function PendingInvitations({ teamId }: { teamId: string }) {
  const [invitations, setInvitations] = useState<Array<{
    id: string;
    email: string;
    role: string;
    status: string;
    invitedBy: string;
    expiresAt: string;
    createdAt: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useState(() => {
    const fetchInvitations = async () => {
      try {
        const res = await fetch(`/api/teams/invite?teamId=${teamId}`);
        if (res.ok) {
          const data = await res.json();
          setInvitations(data.invitations || []);
        }
      } catch (error) {
        console.error("Failed to fetch invitations:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInvitations();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Invitations</CardTitle>
        <CardDescription>
          People who have been invited but haven&apos;t joined yet
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No pending invitations
          </div>
        ) : (
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-lg border bg-card p-3"
              >
                <div className="space-y-1">
                  <div className="font-medium">{inv.email}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{inv.role}</Badge>
                    <span>·</span>
                    <span>Invited by {inv.invitedBy}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Expires {new Date(inv.expiresAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
