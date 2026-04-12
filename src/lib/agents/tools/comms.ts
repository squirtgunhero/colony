// ============================================================================
// Agent Tool Definitions: Communications
// Maps to existing actions: sendSMS, sendEmail, getConversationHistory
// These are Tier 2 (requires approval) — Tara confirms before executing
// ============================================================================

export const commsTools = [
  {
    type: "custom" as const,
    name: "send_sms",
    description:
      "Send an SMS message to a contact via Twilio. TIER 2: Always show the exact message content and recipient to the user and get confirmation before calling this tool. Requires the contact's phone number and the message body. Keep messages under 160 characters when possible. Include opt-out language on first contact.",
    input_schema: {
      type: "object" as const,
      properties: {
        contactId: {
          type: "string",
          description: "The contact's ID (use search_contacts to find it)",
        },
        phone: {
          type: "string",
          description: "Recipient phone number (E.164 format preferred, e.g., +15551234567)",
        },
        message: {
          type: "string",
          description: "The SMS message body to send",
        },
      },
      required: ["phone", "message"],
    },
  },
  {
    type: "custom" as const,
    name: "send_email",
    description:
      "Send an email to a contact via Gmail or Resend. TIER 2: Always show the full email (to, subject, body) to the user and get confirmation before calling this tool. Requires recipient email, subject line, and body. Supports HTML body content.",
    input_schema: {
      type: "object" as const,
      properties: {
        contactId: {
          type: "string",
          description: "The contact's ID (optional, for logging)",
        },
        to: {
          type: "string",
          description: "Recipient email address",
        },
        subject: {
          type: "string",
          description: "Email subject line",
        },
        body: {
          type: "string",
          description: "Email body content (plain text or HTML)",
        },
        replyToThreadId: {
          type: "string",
          description: "Optional thread ID to reply to an existing conversation",
        },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    type: "custom" as const,
    name: "get_conversation_history",
    description:
      "Get the communication history for a contact — SMS messages, emails, and call logs. Returns a chronological list of interactions. Use this to review past communication before sending a new message, or when the user asks about prior conversations with a contact.",
    input_schema: {
      type: "object" as const,
      properties: {
        contactId: {
          type: "string",
          description: "The contact's ID to get history for",
        },
        channel: {
          type: "string",
          enum: ["sms", "email", "call", "all"],
          default: "all",
          description: "Filter by communication channel",
        },
        limit: {
          type: "integer",
          description: "Max messages to return (default 20)",
          default: 20,
        },
      },
      required: ["contactId"],
    },
  },
];
