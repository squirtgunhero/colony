// ============================================================================
// Agent Tool Handler
// Bridges Managed Agent custom tool calls → existing Action Registry executors
//
// The existing action functions in src/lib/lam/actions/ are the implementation.
// This file maps the agent tool names to those action names and invokes them.
// ============================================================================

import { executeAction, getActionRegistry } from "@/lib/lam/actions";
import type { LAMContext, ActionResult } from "@/lib/lam/actions/types";

/**
 * Maps Managed Agent tool names → existing Action Registry action names.
 * Agent tools use snake_case; Action Registry uses camelCase.
 */
export const TOOL_TO_ACTION: Record<string, string> = {
  // Contacts
  search_contacts: "searchContacts",
  create_contact: "createContact",
  update_contact: "updateContact",

  // Deals
  search_deals: "searchDeals",
  create_deal: "createDeal",
  update_deal: "updateDeal",

  // Tasks
  get_upcoming_tasks: "getUpcomingTasks",
  create_task: "createTask",
  complete_task: "completeTask",
  schedule_follow_up: "scheduleFollowUp",

  // Communications (Tier 2)
  send_sms: "sendSMS",
  send_email: "sendEmail",
  get_conversation_history: "getConversationHistory",

  // Pipeline
  get_pipeline_summary: "getPipelineSummary",
  get_activity_feed: "getActivityFeed",

  // Playbooks
  list_playbooks: "listPlaybooks",
  run_playbook: "runPlaybook",

  // Search / Research
  search_mls_listings: "searchMLSListings",
  get_property_valuation: "getPropertyValuation",
  web_search_market_data: "webSearchMarketData",

  // Honeycomb (Phase 3)
  get_campaign_performance: "getCampaignPerformance",
  create_campaign: "createCampaign",
  pause_campaign: "pauseCampaign",
  resume_campaign: "resumeCampaign",
};

/** Check if a tool name is a custom CRM tool (vs. a built-in agent tool) */
export function isCustomTool(toolName: string): boolean {
  return toolName in TOOL_TO_ACTION;
}

/** Get the risk tier for a tool (used for audit logging) */
export function getToolRiskTier(toolName: string): number | null {
  const actionName = TOOL_TO_ACTION[toolName];
  if (!actionName) return null;

  const registry = getActionRegistry();
  const action = registry.find((a) => a.name === actionName);
  return action?.riskTier ?? null;
}

/**
 * Execute a custom tool call by routing to the existing Action Registry.
 * Returns a result compatible with the Managed Agent custom_tool_result format.
 */
export async function handleCustomToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  context: LAMContext
): Promise<ActionResult> {
  const actionName = TOOL_TO_ACTION[toolName];

  if (!actionName) {
    return {
      success: false,
      message: `Unknown tool: ${toolName}. Available tools: ${Object.keys(TOOL_TO_ACTION).join(", ")}`,
    };
  }

  // Log Tier 2 actions for audit trail
  const riskTier = getToolRiskTier(toolName);
  if (riskTier === 2) {
    console.log(
      `[AGENT] Executing Tier 2 action: ${actionName} (tool: ${toolName})`,
      JSON.stringify(toolInput)
    );
  }

  try {
    const result = await executeAction(actionName, toolInput, context);
    return result;
  } catch (error) {
    console.error(`[AGENT] Tool execution error: ${toolName}`, error);
    return {
      success: false,
      message: `Error executing ${toolName}: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
