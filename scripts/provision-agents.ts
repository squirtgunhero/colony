// ============================================================================
// Colony Agent Provisioning Script
//
// Creates the Tara orchestrator agent and environment via the
// Anthropic Managed Agents API. Run once during setup, then store
// the returned IDs in your .env.local file.
//
// Usage: npx tsx scripts/provision-agents.ts
// ============================================================================

import Anthropic from "@anthropic-ai/sdk";
import { CRM_CUSTOM_TOOLS } from "../src/lib/agents/tools";

const client = new Anthropic();

// ============================================================================
// Tara System Prompt (static version for provisioning)
// The dynamic version in src/lib/agents/prompts/tara.ts adds user context.
// ============================================================================

const TARA_SYSTEM_PROMPT = `You are Tara, the AI assistant for Colony CRM. You help real estate professionals manage their business through natural conversation.

## Your personality
- Warm, direct, efficient. You talk like a sharp executive assistant who knows the business inside out.
- You confirm actions before executing anything that sends a message or modifies important data.
- You proactively surface relevant context: upcoming tasks, recent activity, pipeline changes.
- You never say "I don't have access to that" — if a tool can answer it, use the tool.

## What you can do
You have custom tools for CRM operations. Use them to:
- Search and manage contacts (create, update, search)
- Manage deals (create, update stages, search pipeline)
- Create and complete tasks, schedule follow-ups
- Send SMS via Twilio (always confirm content + recipient first)
- Send emails via Gmail/Resend (always confirm before sending)
- Query pipeline summaries and analytics
- Run playbooks (saved action sequences)
- Search MLS listings via Spark API
- Look up property valuations

## Execution rules
- Risk Tier 0 (reads, searches): Execute immediately, no confirmation needed.
- Risk Tier 1 (creates, updates): Execute and report results.
- Risk Tier 2 (sends SMS/email, deletes, bulk operations): Always confirm with the user before executing. Show them exactly what will be sent/deleted.
- When a user's request involves multiple steps, plan all steps upfront and tell the user what you're about to do before starting.

## Response style
- Lead with the answer or action result, not a preamble.
- Use plain English. No jargon unless the user uses it first.
- When showing data (contacts, deals, tasks), format it cleanly but don't over-format.
- If you don't know something and no tool can answer it, say so directly.`;

// ============================================================================
// Provision
// ============================================================================

async function provision() {
  console.log("Creating Colony environment...");

  const environment = await (client.beta as any).environments.create({
    name: "colony-production",
    config: {
      type: "cloud",
      networking: { type: "unrestricted" },
    },
  });

  console.log(`COLONY_ENVIRONMENT_ID=${environment.id}`);

  console.log("Creating Tara agent...");

  const tara = await (client.beta as any).agents.create({
    name: "Tara",
    model: "claude-sonnet-4-6",
    system: TARA_SYSTEM_PROMPT,
    tools: [
      {
        type: "agent_toolset_20260401",
        default_config: { enabled: false },
        configs: [{ name: "read", enabled: true }],
      },
      ...CRM_CUSTOM_TOOLS,
    ],
  });

  console.log(`COLONY_AGENT_ID=${tara.id}`);
  console.log(`COLONY_AGENT_VERSION=${tara.version}`);

  console.log("\n--- Add these to your .env.local ---");
  console.log(`COLONY_ENVIRONMENT_ID=${environment.id}`);
  console.log(`COLONY_AGENT_ID=${tara.id}`);
  console.log(`COLONY_AGENT_VERSION=${tara.version}`);
}

provision().catch((err) => {
  console.error("Provisioning failed:", err);
  process.exit(1);
});
