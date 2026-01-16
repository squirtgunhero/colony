// ============================================
// COLONY - App Mode Store
// Manages Chat Mode, Browse Mode, Analyze Mode
// ============================================

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppMode = "chat" | "browse" | "analyze";

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
  // Current app mode
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  
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
      partialize: (state) => ({ mode: state.mode }), // Only persist mode preference
    }
  )
);

// Helper hook to check if we're in chat mode
export const useIsChatMode = () => {
  const mode = useModeStore((state) => state.mode);
  return mode === "chat";
};
