// ============================================
// COLONY - App Mode Store
// Manages View Mode (Chat vs Classic) and drawer state
// ============================================

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppMode = "chat" | "browse" | "analyze";
export type ViewMode = "chat" | "classic";

export type DrawerPanelType =
  | "pipeline"
  | "contact"
  | "deal"
  | "task"
  | "property"
  | null;

export interface DrawerState {
  isOpen: boolean;
  panelType: DrawerPanelType;
  entityId?: string;
  entityName?: string;
}

interface ModeState {
  // Current app mode (legacy — kept for compatibility)
  mode: AppMode;
  setMode: (mode: AppMode) => void;

  // Two-view architecture: chat (zero-chrome) vs classic (sidebar CRM)
  viewMode: ViewMode;
  setViewMode: (viewMode: ViewMode) => void;
  lastClassicRoute: string;
  setLastClassicRoute: (route: string) => void;

  // Context drawer state
  drawer: DrawerState;
  openDrawer: (panelType: DrawerPanelType, entityId?: string, entityName?: string) => void;
  closeDrawer: () => void;

  // Suggestion chips (context-aware, disappear after action)
  activeChips: SuggestionChip[];
  setActiveChips: (chips: SuggestionChip[]) => void;
  clearChips: () => void;
}

export interface SuggestionChip {
  id: string;
  label: string;
  action: string; // Command or prompt
  icon?: string;
  entityId?: string;
  entityType?: string;
}

export const useModeStore = create<ModeState>()(
  persist(
    (set) => ({
      // Default to chat mode
      mode: "chat",
      setMode: (mode) => set({ mode }),

      // View mode — defaults to chat for new users
      viewMode: "chat",
      setViewMode: (viewMode) => set({ viewMode }),
      lastClassicRoute: "/contacts",
      setLastClassicRoute: (route) => set({ lastClassicRoute: route }),

      // Context drawer
      drawer: {
        isOpen: false,
        panelType: null,
      },
      openDrawer: (panelType, entityId, entityName) =>
        set({
          drawer: {
            isOpen: true,
            panelType,
            entityId,
            entityName
          }
        }),
      closeDrawer: () =>
        set({
          drawer: {
            isOpen: false,
            panelType: null,
            entityId: undefined,
            entityName: undefined,
          }
        }),

      // Suggestion chips
      activeChips: [],
      setActiveChips: (chips) => set({ activeChips: chips }),
      clearChips: () => set({ activeChips: [] }),
    }),
    {
      name: "colony-mode",
      partialize: (state) => ({
        mode: state.mode,
        viewMode: state.viewMode,
        lastClassicRoute: state.lastClassicRoute,
      }),
    }
  )
);

// Helper hook to check if we're in chat mode
export const useIsChatMode = () => {
  const mode = useModeStore((state) => state.mode);
  return mode === "chat";
};

// Helper hook to check view mode
export const useViewMode = () => {
  return useModeStore((state) => state.viewMode);
};
