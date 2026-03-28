// ============================================
// COLONY ASSISTANT - Action Types
// Updated to support LAM integration
// ============================================

// Legacy action types (still used for backwards compatibility)
export type Action =
  | { kind: "create_lead"; payload: { name: string; email?: string; budgetMin?: number; budgetMax?: number; source?: string } }
  | { kind: "update_lead"; payload: { leadId: string; patch: Record<string, unknown> } }
  | { kind: "create_task"; payload: { leadId?: string; title: string; dueAt?: string; priority?: "low" | "med" | "high" } }
  | { kind: "log_note"; payload: { leadId: string; note: string } }
  | { kind: "draft_email"; payload: { leadId: string; subject: string; body: string } }
  | { kind: "search"; payload: { entity: "lead" | "deal" | "property"; query: string } }
  | { kind: "summarize"; payload: { entity: "lead" | "deal" | "property"; id: string } };

export type ActionKind = Action["kind"];

// ============================================
// LAM Types - Real AI-powered actions
// ============================================

export interface LamAction {
  type: string;
  action_id: string;
  risk_tier: 0 | 1 | 2;
  requires_approval: boolean;
  payload?: Record<string, unknown>;
}

export interface LamExecutionResult {
  status: "completed" | "partial" | "failed" | "approval_required";
  actions_executed: number;
  actions_failed: number;
  actions_pending_approval: number;
  user_summary: string;
  /** UI-level sentinel signals distilled from raw action result data. */
  action_signals?: {
    /** When true, the chat UI should navigate the user to the /import page. */
    open_import_panel?: boolean;
  };
}

export interface LamVerificationResult {
  status: "verified" | "partial" | "failed";
  verified_count: number;
  failed_count: number;
}

export interface LamPlan {
  intent: string;
  confidence: number;
  actions: LamAction[];
  user_summary: string;
  follow_up_question: string | null;
  response_options?: string[] | null;
  action_cards?: Array<{ type: string; data: Record<string, unknown> }>;
}

export interface LamResponse {
  success: boolean;
  run_id: string;
  plan: LamPlan;
  execution_result: LamExecutionResult | null;
  verification_result: LamVerificationResult | null;
  response: {
    message: string;
    follow_up_question: string | null;
    response_options?: string[] | null;
    requires_approval: boolean;
    can_undo: boolean;
  };
}

// ============================================
// Message Types
// ============================================

export interface WelcomeChip {
  id: string;
  label: string;
  prompt: string;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  // Legacy action format
  actions?: Action[];
  followups?: string[];
  timestamp: Date;
  // LAM-specific fields
  lamResponse?: LamResponse;
  isExecuted?: boolean;
  canUndo?: boolean;
  runId?: string;
  // Welcome message chips
  chips?: WelcomeChip[];
  actionCards?: Array<{ type: string; data: Record<string, unknown> }>;
  // Execution UI
  executionId?: string;
  messageType?: "text" | "execution" | "approval";
}

// ============================================
// Action Execution UI Types
// ============================================

export interface ExecutionStep {
  id: string;
  label: string;
  detail: string;
  status: "pending" | "active" | "complete" | "error" | "awaiting_approval";
  startedAt?: number;
  completedAt?: number;
  result?: unknown;
}

export interface ActionExecution {
  id: string;
  actionType: string;
  label: string;
  icon: string;
  steps: ExecutionStep[];
  status: "running" | "complete" | "error" | "cancelled" | "awaiting_approval";
  result?: LamResponse;
  startedAt: number;
  completedAt?: number;
}

export interface PendingAction {
  id: string;
  action: Action;
  status: "pending" | "applied" | "cancelled";
}

export interface AssistantContext {
  route: string;
  selectedEntity?: { type: "lead" | "deal" | "property" | "task"; id: string; name?: string };
  activeFilters?: Record<string, string>;
  pipelineStage?: string;
}

// Legacy response (from old /api/assistant)
export interface AssistantResponse {
  reply: string;
  actions: Action[];
  followups?: string[];
}

// ============================================
// UI Types
// ============================================

export interface SlashCommand {
  id: string;
  command: string;
  label: string;
  description: string;
  icon: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { id: "add-lead", command: "/add-lead", label: "Add Lead", description: "Create a new lead", icon: "UserPlus" },
  { id: "create-task", command: "/create-task", label: "Create Task", description: "Add a new task", icon: "CheckSquare" },
  { id: "log-note", command: "/log-note", label: "Log Note", description: "Add a note to current lead", icon: "FileText" },
  { id: "search", command: "/search", label: "Search", description: "Search leads, deals, or properties", icon: "Search" },
  { id: "draft-email", command: "/draft-email", label: "Draft Email", description: "Compose an email", icon: "Mail" },
  { id: "summarize", command: "/summarize", label: "Summarize", description: "Get a summary of current item", icon: "BookOpen" },
  { id: "create-deal", command: "/create-deal", label: "Create Deal", description: "Start a new deal", icon: "DollarSign" },
  { id: "import-contacts", command: "/import-contacts", label: "Import Contacts", description: "Bulk import from CSV or HubSpot", icon: "Upload" },
  { id: "undo", command: "/undo", label: "Undo", description: "Undo the last action", icon: "Undo2" },
];

export const SUGGESTION_CHIPS = [
  { id: "add-contact", label: "Add a contact", prompt: "Create a new lead" },
  { id: "hot-contacts", label: "Show hot contacts", prompt: "Find my most engaged leads" },
  { id: "log-call", label: "Log a call", prompt: "Log a call note for the current contact" },
  { id: "create-task", label: "Create a task", prompt: "Create a follow-up task" },
  { id: "create-deal", label: "Start a deal", prompt: "Create a new deal" },
  { id: "summarize", label: "Summarize", prompt: "Summarize the current contact" },
];

// ============================================
// Helper Functions
// ============================================

export function getRiskTierLabel(tier: 0 | 1 | 2): string {
  switch (tier) {
    case 0:
      return "Read-only";
    case 1:
      return "Auto-execute";
    case 2:
      return "Requires approval";
    default:
      return "Unknown";
  }
}

export function getRiskTierColor(tier: 0 | 1 | 2): string {
  switch (tier) {
    case 0:
      return "text-blue-500";
    case 1:
      return "text-green-500";
    case 2:
      return "text-orange-500";
    default:
      return "text-muted-foreground";
  }
}

export function getActionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    "lead.create": "Create Lead",
    "lead.update": "Update Lead",
    "deal.create": "Create Deal",
    "deal.update": "Update Deal",
    "deal.moveStage": "Move Deal Stage",
    "task.create": "Create Task",
    "task.complete": "Complete Task",
    "note.append": "Add Note",
    "crm.search": "Search",
    "email.send": "Send Email",
    "sms.send": "Send SMS",
    "ads.create_campaign": "Create Ad Campaign",
    "ads.check_performance": "Check Ad Performance",
    "ads.analyze_performance": "Analyze Ads",
    "ads.suggest_optimizations": "Optimize Ads",
    "ads.apply_optimization": "Apply Optimization",
    "ads.pause_campaign": "Pause Campaign",
    "ads.resume_campaign": "Resume Campaign",
    "ads.launch_campaign": "Launch Campaign",
    "ads.research_competitors": "Competitor Research",
    "ads.watch_competitor": "Watch Competitor",
    "google.analyze_keywords": "Analyze Keywords",
    "google.pause_campaign": "Pause Google Campaign",
    "google.resume_campaign": "Resume Google Campaign",
    "google.add_negatives": "Add Negative Keywords",
    "google.adjust_bid": "Adjust Budget",
  };
  return labels[type] || type;
}