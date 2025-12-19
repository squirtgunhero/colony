// ============================================
// COLONY ASSISTANT - Zustand Store
// ============================================

import { create } from "zustand";
import type { AssistantMessage, PendingAction, Action, AssistantContext } from "./types";

interface AssistantState {
  // UI State
  isDrawerOpen: boolean;
  isLoading: boolean;
  input: string;
  isSlashMenuOpen: boolean;
  slashMenuIndex: number;
  
  // Messages
  messages: AssistantMessage[];
  
  // Pending Actions (mutations awaiting confirmation)
  pendingActions: PendingAction[];
  
  // Actions
  setInput: (input: string) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  setLoading: (loading: boolean) => void;
  
  // Slash Menu
  openSlashMenu: () => void;
  closeSlashMenu: () => void;
  setSlashMenuIndex: (index: number) => void;
  
  // Messages
  addMessage: (message: AssistantMessage) => void;
  clearMessages: () => void;
  sendMessage: (message: string, context?: AssistantContext) => Promise<void>;
  
  // Pending Actions
  addPendingAction: (action: Action) => void;
  applyAction: (id: string) => void;
  cancelAction: (id: string) => void;
  clearPendingActions: () => void;
}

export const useAssistantStore = create<AssistantState>((set, get) => ({
  // Initial State
  isDrawerOpen: false,
  isLoading: false,
  input: "",
  isSlashMenuOpen: false,
  slashMenuIndex: 0,
  messages: [],
  pendingActions: [],
  
  // UI Actions
  setInput: (input) => {
    const isSlash = input.startsWith("/");
    set({ 
      input,
      isSlashMenuOpen: isSlash && input.length > 0,
      slashMenuIndex: isSlash ? 0 : get().slashMenuIndex,
    });
  },
  
  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),
  toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
  setLoading: (loading) => set({ isLoading: loading }),
  
  // Slash Menu
  openSlashMenu: () => set({ isSlashMenuOpen: true, slashMenuIndex: 0 }),
  closeSlashMenu: () => set({ isSlashMenuOpen: false }),
  setSlashMenuIndex: (index) => set({ slashMenuIndex: index }),
  
  // Messages
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message],
    isDrawerOpen: true, // Auto-open drawer on first message
  })),
  
  clearMessages: () => set({ messages: [], pendingActions: [] }),

  // Send a message and get response from API
  sendMessage: async (message: string, context?: AssistantContext) => {
    const { addMessage, setLoading, closeSlashMenu, setInput } = get();
    
    if (!message.trim()) return;

    // Clear input and close slash menu
    setInput("");
    closeSlashMenu();

    // Add user message
    const userMsgId = `user-${Date.now()}`;
    addMessage({
      id: userMsgId,
      role: "user",
      content: message.trim(),
      timestamp: new Date(),
    });

    setLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), context }),
      });

      if (!res.ok) throw new Error("Failed to get response");

      const data = await res.json();
      
      // Add assistant message
      addMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        actions: data.actions,
        followups: data.followups,
        timestamp: new Date(),
      });
    } catch (error) {
      addMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      });
    } finally {
      setLoading(false);
    }
  },
  
  // Pending Actions
  addPendingAction: (action) => {
    const id = `action-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    set((state) => ({
      pendingActions: [...state.pendingActions, { id, action, status: "pending" }],
    }));
  },
  
  applyAction: (id) => set((state) => ({
    pendingActions: state.pendingActions.map((pa) =>
      pa.id === id ? { ...pa, status: "applied" as const } : pa
    ),
  })),
  
  cancelAction: (id) => set((state) => ({
    pendingActions: state.pendingActions.map((pa) =>
      pa.id === id ? { ...pa, status: "cancelled" as const } : pa
    ),
  })),
  
  clearPendingActions: () => set({ pendingActions: [] }),
}));

