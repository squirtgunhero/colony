// ============================================================================
// Agent Tool Definitions: Playbooks
// Maps to existing actions: listPlaybooks, runPlaybook
// ============================================================================

export const playbookTools = [
  {
    type: "custom" as const,
    name: "list_playbooks",
    description:
      "List available playbooks — pre-built action sequences for common workflows like 'New Lead Follow-Up', 'Open House Drip', or 'Price Reduction Campaign'. Returns playbook names, descriptions, trigger conditions, and step counts. Use this when the user asks about automation or available workflows.",
    input_schema: {
      type: "object" as const,
      properties: {
        activeOnly: {
          type: "boolean",
          description: "Only return active playbooks (default true)",
          default: true,
        },
      },
    },
  },
  {
    type: "custom" as const,
    name: "run_playbook",
    description:
      "Execute a playbook for a specific contact or deal. Playbooks are multi-step action sequences that run automatically. TIER 2 for playbooks that include sends — always confirm with the user before running. Returns the execution status and steps being performed.",
    input_schema: {
      type: "object" as const,
      properties: {
        playbookId: {
          type: "string",
          description: "The playbook's ID (use list_playbooks to find it)",
        },
        contactId: {
          type: "string",
          description: "Contact to run the playbook for",
        },
        dealId: {
          type: "string",
          description: "Deal to run the playbook for (if applicable)",
        },
      },
      required: ["playbookId"],
    },
  },
];
