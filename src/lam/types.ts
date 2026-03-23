// ============================================================================
// COLONY LAM - Shared Types
// Used across all executor modules and the runtime orchestrator
// ============================================================================

import type { Action } from "./actionSchema";

export interface ExecutionContext {
  user_id: string;
  run_id: string;
  dry_run?: boolean;
}

export interface ActionResult {
  action_id: string;
  action_type: string;
  status: "success" | "failed" | "skipped" | "approval_required";
  data?: unknown;
  entity_id?: string;
  error?: string;
  before_state?: unknown;
  after_state?: unknown;
}

export interface ExecutionResult {
  run_id: string;
  status: "completed" | "partial" | "failed" | "approval_required";
  actions_executed: number;
  actions_skipped: number;
  actions_failed: number;
  actions_pending_approval: number;
  results: ActionResult[];
  user_summary: string;
  pending_tier2_actions?: Action[];
}

export type ActionExecutor = (
  action: Action,
  ctx: ExecutionContext
) => Promise<ActionResult>;
