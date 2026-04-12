// ============================================================================
// Agent Tool Definitions: Tasks
// Maps to existing actions: getUpcomingTasks, createTask, completeTask, scheduleFollowUp
// ============================================================================

export const taskTools = [
  {
    type: "custom" as const,
    name: "get_upcoming_tasks",
    description:
      "Get the user's upcoming tasks, sorted by due date. Returns tasks with title, due date, priority, status, and linked contact/deal. Use this when the user asks about their schedule, to-dos, or what's coming up. Can filter by time window.",
    input_schema: {
      type: "object" as const,
      properties: {
        days: {
          type: "integer",
          description: "Number of days ahead to look (default 7)",
          default: 7,
        },
        limit: {
          type: "integer",
          description: "Max tasks to return (default 20)",
          default: 20,
        },
      },
    },
  },
  {
    type: "custom" as const,
    name: "create_task",
    description:
      "Create a new task. Requires a title. Can optionally link to a contact or deal, set a due date, and assign a priority. Returns the created task. Use this for reminders, follow-ups, and action items the user mentions.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Task title (e.g., 'Call John about listing')" },
        dueAt: {
          type: "string",
          description: "Due date in ISO format. Interpret relative dates like 'tomorrow' or 'next Monday' based on the user's timezone.",
        },
        priority: {
          type: "string",
          enum: ["low", "med", "high"],
          default: "med",
          description: "Task priority",
        },
        contactId: {
          type: "string",
          description: "Optional contact ID to link this task to",
        },
        dealId: {
          type: "string",
          description: "Optional deal ID to link this task to",
        },
      },
      required: ["title"],
    },
  },
  {
    type: "custom" as const,
    name: "complete_task",
    description:
      "Mark a task as completed. Requires the task ID. Use search or get_upcoming_tasks first if you only have a task description. Returns confirmation of completion.",
    input_schema: {
      type: "object" as const,
      properties: {
        taskId: { type: "string", description: "The task's ID to complete" },
      },
      required: ["taskId"],
    },
  },
  {
    type: "custom" as const,
    name: "schedule_follow_up",
    description:
      "Schedule a follow-up task for a contact. This is a convenience wrapper that creates a task linked to a contact with a follow-up-specific title. Use when the user says things like 'remind me to follow up with John in 3 days'.",
    input_schema: {
      type: "object" as const,
      properties: {
        contactId: {
          type: "string",
          description: "Contact ID to follow up with (use search_contacts to find it)",
        },
        contactName: {
          type: "string",
          description: "Contact name (for the task title)",
        },
        dueAt: {
          type: "string",
          description: "When to follow up, in ISO format",
        },
        notes: {
          type: "string",
          description: "What to follow up about",
        },
      },
      required: ["contactId", "dueAt"],
    },
  },
];
