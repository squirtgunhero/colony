// ============================================================================
// Agent Tool Definitions: Honeycomb (Meta Ads)
// For Phase 3 sub-agent — marketing operations
// ============================================================================

export const honeycombTools = [
  {
    type: "custom" as const,
    name: "get_campaign_performance",
    description:
      "Get performance metrics for Honeycomb ad campaigns — spend, impressions, clicks, leads generated, cost per lead, and ROAS. Returns both summary and per-campaign breakdowns. Use when the user asks 'how are my ads doing?' or wants campaign analytics.",
    input_schema: {
      type: "object" as const,
      properties: {
        campaignId: {
          type: "string",
          description: "Specific campaign ID (omit for all campaigns)",
        },
        dateRange: {
          type: "string",
          enum: ["today", "last_7_days", "last_30_days", "this_month", "last_month"],
          default: "last_7_days",
          description: "Time period for metrics",
        },
      },
    },
  },
  {
    type: "custom" as const,
    name: "create_campaign",
    description:
      "Create a new Honeycomb ad campaign on Meta (Facebook/Instagram). TIER 2: Always confirm campaign details, budget, and targeting with the user before creating. This is an interactive process — gather all required details through conversation before calling this tool.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Campaign name" },
        objective: {
          type: "string",
          enum: ["lead_generation", "brand_awareness", "traffic", "engagement"],
          description: "Campaign objective",
        },
        dailyBudget: { type: "number", description: "Daily budget in dollars" },
        targetCity: { type: "string", description: "Target city/area" },
        targetRadius: { type: "number", description: "Radius in miles from target city" },
        adHeadline: { type: "string", description: "Ad headline text" },
        adBody: { type: "string", description: "Ad body/description text" },
        adImageUrl: { type: "string", description: "URL of the ad creative image" },
      },
      required: ["name", "objective", "dailyBudget", "targetCity", "adHeadline", "adBody"],
    },
  },
  {
    type: "custom" as const,
    name: "pause_campaign",
    description:
      "Pause an active Honeycomb campaign. The campaign can be resumed later. Use when the user wants to stop ad spend temporarily.",
    input_schema: {
      type: "object" as const,
      properties: {
        campaignId: { type: "string", description: "Campaign ID to pause" },
      },
      required: ["campaignId"],
    },
  },
  {
    type: "custom" as const,
    name: "resume_campaign",
    description:
      "Resume a paused Honeycomb campaign. Restarts ad delivery with previous settings.",
    input_schema: {
      type: "object" as const,
      properties: {
        campaignId: { type: "string", description: "Campaign ID to resume" },
      },
      required: ["campaignId"],
    },
  },
];
