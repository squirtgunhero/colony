// ============================================
// COLONY ASSISTANT - Zustand Store
// Updated for LAM integration with auto-execute + undo
// ============================================

import { create } from "zustand";
import type { 
  AssistantMessage, 
  PendingAction, 
  Action, 
  AssistantContext,
  LamResponse,
} from "./types";

interface AssistantState {
  // UI State
  isDrawerOpen: boolean;
  isLoading: boolean;
  input: string;
  isSlashMenuOpen: boolean;
  slashMenuIndex: number;
  isListening: boolean;
  interimTranscript: string;
  
  // Messages
  messages: AssistantMessage[];
  
  // Last executed run (for undo)
  lastRunId: string | null;
  canUndo: boolean;
  
  // Pending Actions (for Tier 2 approval)
  pendingApprovalRunId: string | null;
  
  // Pending Actions (mutations awaiting confirmation - legacy)
  pendingActions: PendingAction[];
  
  // Actions
  setInput: (input: string) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  setLoading: (loading: boolean) => void;
  
  // Voice State
  setListening: (listening: boolean) => void;
  setInterimTranscript: (transcript: string) => void;
  
  // Slash Menu
  openSlashMenu: () => void;
  closeSlashMenu: () => void;
  setSlashMenuIndex: (index: number) => void;
  
  // Messages
  addMessage: (message: AssistantMessage) => void;
  clearMessages: () => void;
  
  // History
  loadHistory: () => Promise<void>;
  
  // LAM Integration
  sendToLam: (message: string, context?: AssistantContext) => Promise<void>;
  approveRun: (runId: string) => Promise<void>;
  undoLastRun: () => Promise<void>;
  
  // Legacy: Pending Actions
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
  isListening: false,
  interimTranscript: "",
  messages: [],
  lastRunId: null,
  canUndo: false,
  pendingApprovalRunId: null,
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
  
  // Voice State
  setListening: (listening) => set({ isListening: listening }),
  setInterimTranscript: (transcript) => set({ interimTranscript: transcript }),
  
  // Slash Menu
  openSlashMenu: () => set({ isSlashMenuOpen: true, slashMenuIndex: 0 }),
  closeSlashMenu: () => set({ isSlashMenuOpen: false }),
  setSlashMenuIndex: (index) => set({ slashMenuIndex: index }),
  
  // Messages - doesn't auto-open drawer (users want quick commands, not chat)
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message],
  })),
  
  clearMessages: () => set({ 
    messages: [], 
    pendingActions: [],
    lastRunId: null,
    canUndo: false,
    pendingApprovalRunId: null,
  }),

  // ============================================
  // History - Load persisted conversation
  // ============================================
  loadHistory: async () => {
    try {
      const res = await fetch("/api/chat/history");
      if (!res.ok) return;

      const data = await res.json();
      if (!data.messages || data.messages.length === 0) return;

      const hydratedMessages: AssistantMessage[] = data.messages.map(
        (m: {
          id: string;
          role: string;
          content: string;
          channel: string;
          lamRunId: string | null;
          createdAt: string;
        }) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content:
            m.channel !== "web"
              ? `[via ${m.channel.toUpperCase()}] ${m.content}`
              : m.content,
          timestamp: new Date(m.createdAt),
          runId: m.lamRunId,
        })
      );

      set({ messages: hydratedMessages });
    } catch {
      // Non-critical — just start with empty chat
    }
  },

  // ============================================
  // LAM Integration - Send to AI
  // ============================================
  sendToLam: async (message: string, context?: AssistantContext) => {
    const { addMessage, setLoading, closeSlashMenu, setInput } = get();
    
    if (!message.trim()) return;

    // Handle /undo command
    if (message.trim().toLowerCase() === "/undo") {
      setInput("");
      closeSlashMenu();
      await get().undoLastRun();
      return;
    }

    // Help shortcut
    const lowerMsg = message.trim().toLowerCase();
    if (["help", "?", "commands", "what can you do"].includes(lowerMsg)) {
      setInput("");
      closeSlashMenu();
      addMessage({
        id: `user-${Date.now()}`,
        role: "user",
        content: message.trim(),
        timestamp: new Date(),
      });
      addMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Here's what I can do:\n\n\u2022 Add a contact \u2014 \"Add John Smith as a lead\"\n\u2022 Update a contact \u2014 \"Mark Sarah as a client\"\n\u2022 Create a deal \u2014 \"New $50K deal for Main St\"\n\u2022 Move a deal \u2014 \"Move Johnson deal to negotiation\"\n\u2022 Create a task \u2014 \"Remind me to call Mike tomorrow\"\n\u2022 Complete a task \u2014 \"Mark follow-up call as done\"\n\u2022 Add a note \u2014 \"Note on Sarah: prefers email\"\n\u2022 Search anything \u2014 \"Show my pipeline\" or \"Who are my leads?\"\n\u2022 Show referrals \u2014 \"Show my referrals\"\n\nJust talk to me like you'd talk to a coworker. I'll figure it out.",
        timestamp: new Date(),
      });
      return;
    }

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
      // Build recent context from selected entity
      const recentContext = context?.selectedEntity ? [{
        entity_type: context.selectedEntity.type as "contact" | "deal" | "task" | "property",
        entity_id: context.selectedEntity.id,
        entity_name: context.selectedEntity.name,
        last_touched: new Date().toISOString(),
      }] : undefined;

      const res = await fetch("/api/lam/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: message.trim(),
          recent_context: recentContext,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get response");
      }

      const data: LamResponse = await res.json();

      let responseContent = data.response.message;
      
      if (data.response.follow_up_question) {
        responseContent += `\n\n${data.response.follow_up_question}`;
      }

      // Update state for undo capability
      if (data.response.can_undo) {
        set({ lastRunId: data.run_id, canUndo: true });
      }

      // Track pending approval
      if (data.response.requires_approval) {
        set({ pendingApprovalRunId: data.run_id });
      }

      // Add assistant message
      addMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: responseContent,
        timestamp: new Date(),
        lamResponse: data,
        isExecuted: data.execution_result?.status === "completed",
        canUndo: data.response.can_undo,
        runId: data.run_id,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
        timestamp: new Date(),
      });
    } finally {
      setLoading(false);
    }
  },

  // ============================================
  // Approve Tier 2 Actions
  // ============================================
  approveRun: async (runId: string) => {
    const { addMessage, setLoading } = get();
    
    setLoading(true);

    try {
      const res = await fetch("/api/lam/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ run_id: runId }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to approve");
      }

      const data = await res.json();

      addMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: `✓ Approved! ${data.execution_result?.actions_executed || 0} action(s) executed.`,
        timestamp: new Date(),
      });

      set({ pendingApprovalRunId: null });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: `Failed to approve: ${errorMessage}`,
        timestamp: new Date(),
      });
    } finally {
      setLoading(false);
    }
  },

  // ============================================
  // Undo Last Run
  // ============================================
  undoLastRun: async () => {
    const { addMessage, setLoading, lastRunId, canUndo } = get();
    
    if (!canUndo || !lastRunId) {
      addMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Nothing to undo. You can undo actions right after they're executed.",
        timestamp: new Date(),
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/lam/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ run_id: lastRunId }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to undo");
      }

      const data = await res.json();

      if (data.success) {
        addMessage({
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: `↩️ Undone! Reverted ${data.changes_reverted} change${data.changes_reverted > 1 ? "s" : ""}.`,
          timestamp: new Date(),
        });
        set({ lastRunId: null, canUndo: false });
      } else {
        addMessage({
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: `Could not undo: ${data.errors?.join(", ") || "Unknown error"}`,
          timestamp: new Date(),
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: `Failed to undo: ${errorMessage}`,
        timestamp: new Date(),
      });
    } finally {
      setLoading(false);
    }
  },
  
  // ============================================
  // Legacy Pending Actions (for backwards compat)
  // ============================================
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
