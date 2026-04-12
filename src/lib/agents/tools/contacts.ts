// ============================================================================
// Agent Tool Definitions: Contacts
// Maps to existing actions: searchContacts, createContact, updateContact
// ============================================================================

export const contactTools = [
  {
    type: "custom" as const,
    name: "search_contacts",
    description:
      "Search for contacts in the CRM by name, email, phone, or any combination. Returns matching contacts with key fields (name, email, phone, type, source, tags). Use this before any contact-specific operation to find the right record. Supports partial name matching and case-insensitive search.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "Free-text search query — matches against name, email, phone",
        },
        type: {
          type: "string",
          enum: ["lead", "client", "agent", "vendor"],
          description: "Filter by contact type",
        },
        source: {
          type: "string",
          description: "Filter by lead source (e.g., 'zillow', 'referral', 'open_house')",
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
    name: "create_contact",
    description:
      "Create a new contact in the CRM. Requires at minimum a name. Phone and email are strongly recommended. The contact will be linked to the current user's profile. Returns the created contact record with its ID. Use type 'lead' for new prospects, 'client' for active clients.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Contact's full name (required)" },
        email: { type: "string", description: "Email address" },
        phone: {
          type: "string",
          description: "Phone number (any format, will be normalized)",
        },
        type: {
          type: "string",
          enum: ["lead", "client", "agent", "vendor"],
          default: "lead",
          description: "Contact type — defaults to 'lead'",
        },
        source: {
          type: "string",
          description:
            "Lead source (e.g., 'zillow', 'referral', 'open_house', 'website')",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags to apply (e.g., ['buyer', 'first-time'])",
        },
        notes: { type: "string", description: "Initial notes about this contact" },
      },
      required: ["name"],
    },
  },
  {
    type: "custom" as const,
    name: "update_contact",
    description:
      "Update fields on an existing contact. Requires the contact ID (use search_contacts first if you only have a name). Only include fields that should change — omitted fields are left untouched. Can update name, email, phone, type, tags, and notes.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The contact's ID (use search_contacts to find it)" },
        name: { type: "string", description: "Update contact name if needed" },
        patch: {
          type: "object",
          description: "Fields to update on the contact",
          properties: {
            name: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            type: {
              type: "string",
              enum: ["lead", "client", "agent", "vendor"],
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Replace all tags with this list",
            },
            notes: { type: "string", description: "Append to existing notes" },
            isFavorite: { type: "boolean" },
          },
        },
      },
      required: ["id"],
    },
  },
];
