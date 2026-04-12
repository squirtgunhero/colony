// ============================================================================
// Agent Tool Definitions: Pipeline & Activity
// Maps to existing actions: getPipelineSummary, getActivityFeed
// ============================================================================

export const pipelineTools = [
  {
    type: "custom" as const,
    name: "get_pipeline_summary",
    description:
      "Get a summary of the user's deal pipeline — total deals, value by stage, recent activity, and key metrics. Use this when the user asks 'how's my pipeline?', 'show me my deals', or wants a business overview. Returns counts and dollar values grouped by stage.",
    input_schema: {
      type: "object" as const,
      properties: {
        includeDetails: {
          type: "boolean",
          description: "Include individual deal details in addition to aggregate summary (default false)",
          default: false,
        },
      },
    },
  },
  {
    type: "custom" as const,
    name: "get_activity_feed",
    description:
      "Get the recent activity feed — new contacts, deal updates, completed tasks, sent messages, and other CRM events. Returns a chronological list of activities. Use this when the user asks 'what happened today?' or wants to see recent changes.",
    input_schema: {
      type: "object" as const,
      properties: {
        days: {
          type: "integer",
          description: "Number of days of activity to return (default 7)",
          default: 7,
        },
        limit: {
          type: "integer",
          description: "Max activities to return (default 30)",
          default: 30,
        },
        type: {
          type: "string",
          enum: ["contact", "deal", "task", "message", "all"],
          default: "all",
          description: "Filter by activity type",
        },
      },
    },
  },
];
