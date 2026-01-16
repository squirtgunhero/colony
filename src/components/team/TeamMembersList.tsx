"use client";

// ============================================================================
// Team Members List - Display and manage team members
// ============================================================================

import { useEffect, useState } from "react";
import { useTeamStore, TeamMember } from "@/lib/team/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Shield,
  ShieldCheck,
  User,
  Eye,
  Crown,
  UserMinus,
  Loader2,
} from "lucide-react";

interface TeamMembersListProps {
  teamId: string;
  className?: string;
}

const roleConfig = {
  owner: { label: "Owner", icon: Crown, color: "text-amber-500" },
  admin: { label: "Admin", icon: ShieldCheck, color: "text-blue-500" },
  member: { label: "Member", icon: User, color: "text-green-500" },
  viewer: { label: "Viewer", icon: Eye, color: "text-muted-foreground" },
};

export function TeamMembersList({ teamId, className }: TeamMembersListProps) {
  const { currentTeam } = useTeamStore();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setCurrentUserRole(data.currentUserRole);
      }
    } catch (error) {
      console.error("Failed to fetch members:", error);
      toast.error("Failed to load team members");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (teamId) {
      fetchMembers();
    }
  }, [teamId]);

  const canManageMembers = currentUserRole === "owner" || currentUserRole === "admin";

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update role");
      }

      toast.success("Role updated");
      fetchMembers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role");
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    setIsRemoving(true);
    try {
      const res = await fetch(
        `/api/teams/${teamId}/members?memberId=${memberToRemove.id}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove member");
      }

      toast.success("Member removed");
      setMemberToRemove(null);
      fetchMembers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove member");
    } finally {
      setIsRemoving(false);
    }
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className={cn("space-y-2", className)}>
        {members.map((member) => {
          const role = roleConfig[member.role as keyof typeof roleConfig] || roleConfig.member;
          const RoleIcon = role.icon;
          const initials = member.user.fullName
            ?.split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || member.user.email?.[0].toUpperCase() || "?";

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-lg border bg-card p-3"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={member.user.avatarUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {member.user.fullName || member.user.email || "Unknown"}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {member.user.email}
                </div>
              </div>

              <Badge variant="secondary" className={cn("gap-1", role.color)}>
                <RoleIcon className="h-3 w-3" />
                {role.label}
              </Badge>

              {canManageMembers && member.role !== "owner" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {currentUserRole === "owner" && (
                      <>
                        <DropdownMenuItem
                          onClick={() => handleChangeRole(member.id, "admin")}
                          disabled={member.role === "admin"}
                        >
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          Make Admin
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem
                      onClick={() => handleChangeRole(member.id, "member")}
                      disabled={member.role === "member"}
                    >
                      <User className="mr-2 h-4 w-4" />
                      Make Member
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleChangeRole(member.id, "viewer")}
                      disabled={member.role === "viewer"}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Make Viewer
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setMemberToRemove(member)}
                      className="text-destructive focus:text-destructive"
                    >
                      <UserMinus className="mr-2 h-4 w-4" />
                      Remove from Team
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}

        {members.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No team members yet
          </div>
        )}
      </div>

      {/* Remove confirmation dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>{memberToRemove?.user.fullName || memberToRemove?.user.email}</strong>{" "}
              from {currentTeam?.name || "this team"}? They will lose access to all team data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
