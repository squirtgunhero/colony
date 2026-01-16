"use client";

// ============================================================================
// Team Switcher - Dropdown to switch between teams
// ============================================================================

import { useEffect, useState } from "react";
import { useTeamStore, Team } from "@/lib/team/store";
import { cn } from "@/lib/utils";
import {
  Users,
  ChevronDown,
  Plus,
  Check,
  Building2,
  User,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateTeamModal } from "./CreateTeamModal";

interface TeamSwitcherProps {
  expanded?: boolean;
  className?: string;
}

export function TeamSwitcher({ expanded = true, className }: TeamSwitcherProps) {
  const { currentTeam, teams, setCurrentTeam, fetchTeams, isLoading } = useTeamStore();
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const handleSelectTeam = (team: Team | null) => {
    setCurrentTeam(team);
  };

  const displayName = currentTeam?.name || "Personal";
  const displayIcon = currentTeam ? Building2 : User;
  const DisplayIcon = displayIcon;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-2 rounded-lg transition-colors",
              "text-neutral-300 hover:bg-neutral-800/50 hover:text-neutral-100",
              expanded ? "w-full px-2.5 py-2" : "w-10 h-10 justify-center",
              className
            )}
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-neutral-800">
              <DisplayIcon className="h-3.5 w-3.5" />
            </div>
            {expanded && (
              <>
                <span className="flex-1 text-left text-sm font-medium truncate">
                  {displayName}
                </span>
                <ChevronDown className="h-4 w-4 text-neutral-500" />
              </>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Switch Workspace
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Personal workspace */}
          <DropdownMenuItem
            onClick={() => handleSelectTeam(null)}
            className="flex items-center gap-2"
          >
            <User className="h-4 w-4" />
            <span className="flex-1">Personal</span>
            {!currentTeam && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>

          {/* Teams */}
          {teams.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Teams
              </DropdownMenuLabel>
              {teams.map((team) => (
                <DropdownMenuItem
                  key={team.id}
                  onClick={() => handleSelectTeam(team)}
                  className="flex items-center gap-2"
                >
                  <Building2 className="h-4 w-4" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{team.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {team.memberCount} member{team.memberCount !== 1 ? "s" : ""} · {team.role}
                    </div>
                  </div>
                  {currentTeam?.id === team.id && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </DropdownMenuItem>
              ))}
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 text-primary"
          >
            <Plus className="h-4 w-4" />
            <span>Create Team</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateTeamModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal}
      />
    </>
  );
}
