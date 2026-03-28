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
  ActionExecution,
  ExecutionStep,
} from "./types";
import { getActionUIDef } from "@/lib/lam/actionSteps";

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

  // Action Execution UI
  executions: Map<string, ActionExecution>;

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
  
  // Execution UI
  startExecution: (id: string, actionType: string) => void;
  advanceStep: (executionId: string, stepId: string, status: ExecutionStep["status"]) => void;
  completeExecution: (executionId: string, result: LamResponse) => void;
  failExecution: (executionId: string, error?: string) => void;
  cancelExecution: (executionId: string) => void;
  setExecutionAwaitingApproval: (executionId: string) => void;
  getExecution: (id: string) => ActionExecution | undefined;

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
  executions: new Map(),

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
    executions: new Map(),
  }),

  // ============================================
  // History - Load persisted conversation
  // ============================================
  loadHistory: async () => {
    try {
      // Skip if messages already loaded (e.g. navigating back to /chat)
      if (get().messages.length > 0) return;

      const res = await fetch("/api/chat/history");
      if (!res.ok) return;

      const data = await res.json();

      // No history → show a personalised welcome message with quick-action chips
      if (!data.messages || data.messages.length === 0) {
        // Double-check again after async fetch
        if (get().messages.length > 0) return;
        try {
          const welcomeRes = await fetch("/api/lam/welcome");
          if (welcomeRes.ok) {
            const welcome = await welcomeRes.json();
            const lines: string[] = [welcome.greeting];
            if (welcome.status_lines?.length) {
              lines.push(welcome.status_lines.join(" "));
            }
            lines.push("What would you like to do?");

            get().addMessage({
              id: `welcome-${Date.now()}`,
              role: "assistant",
              content: lines.join("\n\n"),
              timestamp: new Date(),
              chips: welcome.chips ?? [],
            });
          }
        } catch {
          // Welcome failed — start with empty chat, no error shown to user
        }
        return;
      }

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

    // Intercept "show me the ad" / "preview" when there's a pending approval
    const pendingRunId = get().pendingApprovalRunId;
    if (pendingRunId) {
      const previewPattern = /\b(see|show|view|preview|look at)\b.*\b(ad|campaign|creative|it)\b/i;
      if (previewPattern.test(lowerMsg)) {
        setInput("");
        closeSlashMenu();
        addMessage({
          id: `user-${Date.now()}`,
          role: "user",
          content: message.trim(),
          timestamp: new Date(),
        });

        // Find the pending execution message with ad details
        const pendingMsg = get().messages.find(
          (m) => m.runId === pendingRunId && m.lamResponse
        );
        const plan = pendingMsg?.lamResponse?.plan;
        const adAction = plan?.actions?.find(
          (a: { type: string }) => a.type === "ads.create_campaign" || a.type === "marketing.social_post"
        );
        const payload = adAction?.payload as Record<string, unknown> | undefined;

        let previewContent = "";
        if (payload && (payload.ad_headline || payload.ad_body)) {
          previewContent = `Here's your ad preview:\n\n**${payload.ad_headline || ""}**\n${payload.ad_body || ""}\n_${payload.ad_description || ""}_\n\n`;
          if (payload.daily_budget) previewContent += `**Budget:** $${payload.daily_budget}/day\n`;
          if (payload.objective) previewContent += `**Objective:** ${payload.objective}\n`;
          previewContent += "\nApprove to launch, or tell me what to change.";
        } else {
          previewContent = "The ad details are in the campaign card above. Scroll up to review, then tap Approve when you're ready.";
        }

        addMessage({
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: previewContent,
          timestamp: new Date(),
        });
        return;
      }
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

      // Determine if this action has an execution UI
      const primaryActionType = data.plan?.actions?.[0]?.type;
      const hasExecUI = primaryActionType ? !!getActionUIDef(primaryActionType) : false;
      const hasExecution = data.execution_result && (
        data.execution_result.status === "completed" ||
        data.execution_result.status === "partial" ||
        data.execution_result.status === "approval_required"
      );

      if (hasExecUI && primaryActionType && hasExecution) {
        // Use execution card UI
        const execId = `exec-${data.run_id}`;

        // Start the execution animation
        get().startExecution(execId, primaryActionType);

        // Add execution message to chat
        addMessage({
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: responseContent,
          timestamp: new Date(),
          lamResponse: data,
          isExecuted: data.execution_result?.status === "completed",
          canUndo: data.response.can_undo,
          runId: data.run_id,
          actionCards: data.plan?.action_cards || [],
          executionId: execId,
          messageType: "execution",
        });

        // Calculate total animation time from step defs
        const uiDef = getActionUIDef(primaryActionType);
        const totalAnimTime = uiDef
          ? uiDef.steps.reduce((sum, s) => sum + Math.max(s.estimatedDuration, 400), 0)
          : 2000;

        // Handle approval state
        if (data.response.requires_approval) {
          setTimeout(() => {
            get().setExecutionAwaitingApproval(execId);
          }, totalAnimTime);
        } else {
          // Complete execution after animation finishes
          setTimeout(() => {
            get().completeExecution(execId, data);
          }, totalAnimTime);
        }
      } else {
        // Fall through to normal text message
        addMessage({
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: responseContent,
          timestamp: new Date(),
          lamResponse: data,
          isExecuted: data.execution_result?.status === "completed",
          canUndo: data.response.can_undo,
          runId: data.run_id,
          actionCards: data.plan?.action_cards || [],
        });
      }

      // Handle UI sentinel: open the import panel when Tara triggers contacts.import
      // with a file/HubSpot source. Delay slightly so the message can render first.
      if (data.execution_result?.action_signals?.open_import_panel) {
        setTimeout(() => {
          window.location.href = "/import";
        }, 900);
      }

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

      // Build a descriptive result message
      const exec = data.execution_result;
      let resultMsg: string;
      if (exec?.actions_executed > 0 && exec?.actions_failed === 0) {
        resultMsg = exec.user_summary || `Done! ${exec.actions_executed} action(s) completed.`;
      } else if (exec?.actions_failed > 0) {
        const failDetails = exec.results
          ?.filter((r: { status: string; error?: string }) => r.status !== "success")
          .map((r: { action_type: string; error?: string }) => r.error || r.action_type)
          .join("; ");
        resultMsg = `Approved, but ${exec.actions_failed} action(s) failed${failDetails ? `: ${failDetails}` : "."}`;
      } else {
        resultMsg = `Approved. ${exec?.actions_executed || 0} action(s) executed.`;
      }

      addMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: resultMsg,
        timestamp: new Date(),
      });

      // Complete any awaiting execution card
      const execId = `exec-${runId}`;
      const execution = get().executions.get(execId);
      if (execution && execution.status === "awaiting_approval") {
        get().completeExecution(execId, data as LamResponse);
      }

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
          content: `Undone. Reverted ${data.changes_reverted} change${data.changes_reverted > 1 ? "s" : ""}.`,
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
  // Action Execution UI
  // ============================================
  startExecution: (id: string, actionType: string) => {
    const uiDef = getActionUIDef(actionType);
    if (!uiDef) return;

    const execution: ActionExecution = {
      id,
      actionType,
      label: uiDef.label,
      icon: uiDef.icon,
      steps: uiDef.steps.map((s) => ({
        id: s.id,
        label: s.label,
        detail: s.detail,
        status: "pending" as const,
      })),
      status: "running",
      startedAt: Date.now(),
    };

    // Set first step to active
    if (execution.steps.length > 0) {
      execution.steps[0].status = "active";
      execution.steps[0].startedAt = Date.now();
    }

    set((state) => {
      const next = new Map(state.executions);
      next.set(id, execution);
      return { executions: next };
    });

    // Start optimistic step animation using estimated durations
    const stepDefs = uiDef.steps;
    let cumulativeDelay = 0;

    for (let i = 0; i < stepDefs.length; i++) {
      const stepDef = stepDefs[i];
      const minVisible = 400; // Minimum visible time per step
      const duration = Math.max(stepDef.estimatedDuration, minVisible);

      if (i > 0) {
        // Activate this step after the cumulative delay
        const activateAt = cumulativeDelay;
        setTimeout(() => {
          const current = get().executions.get(id);
          // Only animate if still running and step is still pending
          if (!current || current.status !== "running") return;
          if (current.steps[i].status !== "pending") return;

          set((state) => {
            const exec = state.executions.get(id);
            if (!exec || exec.status !== "running") return state;

            const updatedSteps = [...exec.steps];
            updatedSteps[i] = { ...updatedSteps[i], status: "active", startedAt: Date.now() };
            // Mark previous step as complete
            if (i > 0 && updatedSteps[i - 1].status === "active") {
              updatedSteps[i - 1] = { ...updatedSteps[i - 1], status: "complete", completedAt: Date.now() };
            }

            const next = new Map(state.executions);
            next.set(id, { ...exec, steps: updatedSteps });
            return { executions: next };
          });
        }, activateAt);
      }

      cumulativeDelay += duration;
    }
  },

  advanceStep: (executionId: string, stepId: string, status: ExecutionStep["status"]) => {
    set((state) => {
      const exec = state.executions.get(executionId);
      if (!exec) return state;

      const updatedSteps = exec.steps.map((s) =>
        s.id === stepId
          ? { ...s, status, ...(status === "complete" ? { completedAt: Date.now() } : {}), ...(status === "active" ? { startedAt: Date.now() } : {}) }
          : s
      );

      const next = new Map(state.executions);
      next.set(executionId, { ...exec, steps: updatedSteps });
      return { executions: next };
    });
  },

  completeExecution: (executionId: string, result: LamResponse) => {
    set((state) => {
      const exec = state.executions.get(executionId);
      if (!exec) return state;

      // Mark all remaining steps as complete
      const now = Date.now();
      const updatedSteps = exec.steps.map((s) =>
        s.status === "pending" || s.status === "active"
          ? { ...s, status: "complete" as const, completedAt: now, startedAt: s.startedAt ?? now }
          : s
      );

      // Determine the result renderer from the action UI def
      const uiDef = getActionUIDef(exec.actionType);
      const resultWithRenderer = {
        ...result,
        __resultRenderer: uiDef?.resultRenderer ?? "CRMResult",
      };

      const next = new Map(state.executions);
      next.set(executionId, {
        ...exec,
        steps: updatedSteps,
        status: "complete",
        result: resultWithRenderer as unknown as LamResponse,
        completedAt: now,
      });
      return { executions: next };
    });
  },

  failExecution: (executionId: string, error?: string) => {
    set((state) => {
      const exec = state.executions.get(executionId);
      if (!exec) return state;

      // Mark active step as error, leave rest as pending
      const updatedSteps = exec.steps.map((s) =>
        s.status === "active"
          ? { ...s, status: "error" as const, result: error }
          : s
      );

      const next = new Map(state.executions);
      next.set(executionId, { ...exec, steps: updatedSteps, status: "error" });
      return { executions: next };
    });
  },

  cancelExecution: (executionId: string) => {
    set((state) => {
      const exec = state.executions.get(executionId);
      if (!exec) return state;

      const next = new Map(state.executions);
      next.set(executionId, { ...exec, status: "cancelled" });
      return { executions: next };
    });
  },

  setExecutionAwaitingApproval: (executionId: string) => {
    set((state) => {
      const exec = state.executions.get(executionId);
      if (!exec) return state;

      // Find the last active or next pending step and mark it as awaiting_approval
      const updatedSteps = [...exec.steps];
      const activeIdx = updatedSteps.findIndex((s) => s.status === "active");
      if (activeIdx >= 0) {
        updatedSteps[activeIdx] = { ...updatedSteps[activeIdx], status: "awaiting_approval" };
      }

      const next = new Map(state.executions);
      next.set(executionId, { ...exec, steps: updatedSteps, status: "awaiting_approval" });
      return { executions: next };
    });
  },

  getExecution: (id: string) => {
    return get().executions.get(id);
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
