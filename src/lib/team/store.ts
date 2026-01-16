// ============================================================================
// Team Store - Manage current team context
// ============================================================================

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TeamMember {
  id: string;
  userId: string;
  role: "owner" | "admin" | "member" | "viewer";
  joinedAt: string;
  user: {
    id: string;
    email: string | null;
    fullName: string | null;
    avatarUrl: string | null;
  };
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  role: string;
  owner: {
    id: string;
    email: string | null;
    fullName: string | null;
    avatarUrl: string | null;
  };
  memberCount: number;
  joinedAt: string;
  createdAt: string;
}

interface TeamState {
  // Current active team (null = personal workspace)
  currentTeam: Team | null;
  teams: Team[];
  isLoading: boolean;
  
  // Actions
  setCurrentTeam: (team: Team | null) => void;
  setTeams: (teams: Team[]) => void;
  addTeam: (team: Team) => void;
  removeTeam: (teamId: string) => void;
  setLoading: (loading: boolean) => void;
  fetchTeams: () => Promise<void>;
}

export const useTeamStore = create<TeamState>()(
  persist(
    (set, get) => ({
      currentTeam: null,
      teams: [],
      isLoading: false,

      setCurrentTeam: (team) => set({ currentTeam: team }),
      
      setTeams: (teams) => set({ teams }),
      
      addTeam: (team) => set((state) => ({ 
        teams: [...state.teams, team] 
      })),
      
      removeTeam: (teamId) => set((state) => ({
        teams: state.teams.filter((t) => t.id !== teamId),
        currentTeam: state.currentTeam?.id === teamId ? null : state.currentTeam,
      })),
      
      setLoading: (loading) => set({ isLoading: loading }),

      fetchTeams: async () => {
        set({ isLoading: true });
        try {
          const res = await fetch("/api/teams");
          if (res.ok) {
            const data = await res.json();
            set({ teams: data.teams || [] });
          }
        } catch (error) {
          console.error("Failed to fetch teams:", error);
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: "colony-team",
      partialize: (state) => ({ 
        currentTeam: state.currentTeam,
      }),
    }
  )
);
