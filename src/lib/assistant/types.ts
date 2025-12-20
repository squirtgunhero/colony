// ============================================
// COLONY ASSISTANT - Action Types
// ============================================

export type Action =
  | { kind: "create_lead"; payload: { name: string; email?: string; budgetMin?: number; budgetMax?: number; source?: string } }
  | { kind: "update_lead"; payload: { leadId: string; patch: Record<string, unknown> } }
  | { kind: "create_task"; payload: { leadId?: string; title: string; dueAt?: string; priority?: "low" | "med" | "high" } }
  | { kind: "log_note"; payload: { leadId: string; note: string } }
  | { kind: "draft_email"; payload: { leadId: string; subject: string; body: string } }
  | { kind: "search"; payload: { entity: "lead" | "deal" | "property"; query: string } }
  | { kind: "summarize"; payload: { entity: "lead" | "deal" | "property"; id: string } };

export type ActionKind = Action["kind"];

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: Action[];
  followups?: string[];
  timestamp: Date;
}

export interface PendingAction {
  id: string;
  action: Action;
  status: "pending" | "applied" | "cancelled";
}

export interface AssistantContext {
  route: string;
  selectedEntity?: { type: "lead" | "deal" | "property" | "task"; id: string };
  activeFilters?: Record<string, string>;
  pipelineStage?: string;
}

export interface AssistantResponse {
  reply: string;
  actions: Action[];
  followups?: string[];
}

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
];

export const SUGGESTION_CHIPS = [
  { id: "add-contact", label: "Add a contact", prompt: "Add a new contact" },
  { id: "hot-contacts", label: "Show hot contacts", prompt: "Show me the hottest contacts this week" },
  { id: "log-call", label: "Log a call", prompt: "Log a call with the current contact" },
  { id: "create-task", label: "Create a task", prompt: "Create a follow-up task for this contact" },
  { id: "draft-email", label: "Draft an email", prompt: "Draft a follow-up email" },
  { id: "summarize", label: "Summarize this contact", prompt: "Give me a summary of this contact" },
];

