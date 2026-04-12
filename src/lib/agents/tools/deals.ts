// ============================================================================
// Agent Tool Definitions: Deals
// Maps to existing actions: searchDeals, createDeal, updateDeal
// ============================================================================

export const dealTools = [
  {
    type: "custom" as const,
    name: "search_deals",
    description:
      "Search for deals in the CRM pipeline by title, contact name, property address, or stage. Returns matching deals with key fields (title, value, stage, contact, property). Use this to find deals before updating them or to review pipeline status.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Free-text search — matches against deal title, contact name, property address",
        },
        stage: {
          type: "string",
          enum: ["new_lead", "qualified", "showing", "offer", "negotiation", "closed"],
          description: "Filter by deal stage",
        },
        limit: {
          type: "integer",
          description: "Max results to return (default 10, max 50)",
          default: 10,
        },
      },
      required: ["query"],
    },
  },
  {
    type: "custom" as const,
    name: "create_deal",
    description:
      "Create a new deal in the pipeline. Requires a title at minimum. Optionally link to a contact and property. The deal starts at 'new_lead' stage by default. Returns the created deal record with its ID. Use this when a user mentions a new transaction or opportunity.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Deal title (e.g., '123 Main St - Smith Purchase')",
        },
        value: { type: "number", description: "Deal value in dollars" },
        stage: {
          type: "string",
          enum: ["new_lead", "qualified", "showing", "offer", "negotiation", "closed"],
          default: "new_lead",
          description: "Initial pipeline stage",
        },
        contactId: {
          type: "string",
          description: "ID of the associated contact (use search_contacts to find it)",
        },
        propertyId: {
          type: "string",
          description: "ID of the associated property",
        },
        expectedCloseDate: {
          type: "string",
          description: "Expected close date in ISO format (YYYY-MM-DD)",
        },
        notes: { type: "string", description: "Notes about this deal" },
      },
      required: ["title"],
    },
  },
  {
    type: "custom" as const,
    name: "update_deal",
    description:
      "Update an existing deal. Requires the deal ID (use search_deals first). Can update title, value, stage, associated contact/property, close date, and notes. For stage changes, validates logical progression. Only include fields that should change.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The deal's ID (use search_deals to find it)" },
        patch: {
          type: "object",
          description: "Fields to update on the deal",
          properties: {
            title: { type: "string" },
            value: { type: "number" },
            stage: {
              type: "string",
              enum: ["new_lead", "qualified", "showing", "offer", "negotiation", "closed"],
            },
            contactId: { type: "string" },
            propertyId: { type: "string" },
            expectedCloseDate: { type: "string" },
            notes: { type: "string" },
            isFavorite: { type: "boolean" },
          },
        },
      },
      required: ["id"],
    },
  },
];
