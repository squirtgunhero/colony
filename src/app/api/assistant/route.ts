// ============================================
// COLONY ASSISTANT - API Route
// Processes natural language commands
// ============================================

import { NextRequest, NextResponse } from "next/server";
import type { Action, AssistantContext, AssistantResponse } from "@/lib/assistant/types";

interface AssistantRequest {
  message: string;
  context: AssistantContext;
}

/**
 * Parse user message and generate appropriate response and actions
 * In production, this would call an LLM API (OpenAI, Anthropic, etc.)
 */
function processMessage(message: string, context: AssistantContext): AssistantResponse {
  const lowerMessage = message.toLowerCase();
  const actions: Action[] = [];
  let reply = "";
  let followups: string[] | undefined;

  // Handle slash commands
  if (message.startsWith("/")) {
    return handleSlashCommand(message, context);
  }

  // Parse natural language intents
  if (lowerMessage.includes("add") && lowerMessage.includes("lead")) {
    // Extract name if provided (simple regex)
    const nameMatch = message.match(/named?\s+["']?([^"']+)["']?/i) 
      || message.match(/add\s+(?:a\s+)?lead\s+["']?([^"']+)["']?/i);
    
    if (nameMatch) {
      actions.push({
        kind: "create_lead",
        payload: { name: nameMatch[1].trim() }
      });
      reply = `I'll create a new lead named "${nameMatch[1].trim()}". Please review and confirm.`;
    } else {
      reply = "I can help you create a lead. What's their name?";
      followups = ["Add lead John Smith", "Add lead from Zillow"];
    }
  }
  
  else if (lowerMessage.includes("create") && lowerMessage.includes("task")) {
    const titleMatch = message.match(/task\s+(?:to\s+)?["']?([^"']+)["']?/i);
    
    if (titleMatch) {
      actions.push({
        kind: "create_task",
        payload: { 
          title: titleMatch[1].trim(),
          leadId: context.selectedEntity?.type === "lead" ? context.selectedEntity.id : undefined,
        }
      });
      reply = `I'll create a task: "${titleMatch[1].trim()}".`;
    } else if (context.selectedEntity?.type === "lead") {
      reply = "What should the task be?";
      followups = ["Follow up call", "Send property listings", "Schedule showing"];
    } else {
      reply = "What task would you like to create?";
      followups = ["Create task to call new leads", "Create task to review deals"];
    }
  }
  
  else if (lowerMessage.includes("log") && (lowerMessage.includes("call") || lowerMessage.includes("note"))) {
    if (context.selectedEntity?.type === "lead") {
      const noteContent = message.replace(/log\s+(a\s+)?(?:call|note)\s*/i, "").trim();
      if (noteContent) {
        actions.push({
          kind: "log_note",
          payload: { leadId: context.selectedEntity.id, note: noteContent }
        });
        reply = "I'll log this note to the current lead.";
      } else {
        reply = "What would you like to note about this call?";
        followups = ["Discussed budget and timeline", "Left voicemail", "Scheduled follow-up"];
      }
    } else {
      reply = "Please select a lead first, then I can log a note for them.";
    }
  }
  
  else if (lowerMessage.includes("draft") && lowerMessage.includes("email")) {
    if (context.selectedEntity?.type === "lead") {
      actions.push({
        kind: "draft_email",
        payload: {
          leadId: context.selectedEntity.id,
          subject: "Following up on your property search",
          body: "Hi,\n\nI wanted to follow up on our recent conversation about your property search. I have a few listings that might interest you.\n\nWould you be available for a call this week?\n\nBest regards"
        }
      });
      reply = "I've drafted a follow-up email. Review and customize before sending.";
    } else {
      reply = "Please select a lead first so I can draft an email for them.";
    }
  }
  
  else if (lowerMessage.includes("summarize") || lowerMessage.includes("summary")) {
    if (context.selectedEntity) {
      actions.push({
        kind: "summarize",
        payload: { 
          entity: context.selectedEntity.type as "lead" | "deal" | "property",
          id: context.selectedEntity.id 
        }
      });
      reply = "Here's a summary of the current lead:\n\n**JD McLelland** is a qualified buyer lead interested in properties downtown. Budget: $800K-$1.2M. Last contact: 2 days ago via phone. Next step: Schedule property showing.";
    } else {
      reply = "Select a lead, deal, or property first, and I'll give you a summary.";
    }
  }
  
  else if (lowerMessage.includes("search") || lowerMessage.includes("find") || lowerMessage.includes("show")) {
    const queryMatch = message.match(/(?:search|find|show)\s+(?:me\s+)?(?:the\s+)?(?:hot\s+)?(.+)/i);
    if (queryMatch) {
      const query = queryMatch[1].trim();
      actions.push({
        kind: "search",
        payload: { entity: "lead", query }
      });
      reply = `Searching for: "${query}"...`;
    } else {
      reply = "What would you like to search for?";
      followups = ["Hot leads", "Leads from this week", "Deals over $1M"];
    }
  }
  
  else {
    // Default response with suggestions
    reply = "I can help you manage leads, create tasks, log notes, draft emails, and more. What would you like to do?";
    followups = ["Add a new lead", "Show my hot leads", "Create a follow-up task"];
  }

  return { reply, actions, followups };
}

function handleSlashCommand(message: string, context: AssistantContext): AssistantResponse {
  const [command, ...args] = message.slice(1).split(" ");
  const argString = args.join(" ");

  switch (command.toLowerCase()) {
    case "add-lead":
      if (argString) {
        return {
          reply: `Creating lead: ${argString}`,
          actions: [{ kind: "create_lead", payload: { name: argString } }],
        };
      }
      return {
        reply: "Usage: /add-lead [name]",
        actions: [],
        followups: ["/add-lead John Smith", "/add-lead Jane Doe"],
      };

    case "create-task":
      if (argString) {
        return {
          reply: `Creating task: ${argString}`,
          actions: [{
            kind: "create_task",
            payload: {
              title: argString,
              leadId: context.selectedEntity?.type === "lead" ? context.selectedEntity.id : undefined,
            }
          }],
        };
      }
      return {
        reply: "Usage: /create-task [title]",
        actions: [],
        followups: ["/create-task Follow up call", "/create-task Send listings"],
      };

    case "log-note":
      if (!context.selectedEntity?.type) {
        return { reply: "Select a lead first to log a note.", actions: [] };
      }
      if (argString) {
        return {
          reply: "Note logged.",
          actions: [{
            kind: "log_note",
            payload: { leadId: context.selectedEntity.id, note: argString }
          }],
        };
      }
      return { reply: "Usage: /log-note [note content]", actions: [] };

    case "search":
      if (argString) {
        return {
          reply: `Searching: ${argString}`,
          actions: [{ kind: "search", payload: { entity: "lead", query: argString } }],
        };
      }
      return {
        reply: "Usage: /search [query]",
        actions: [],
        followups: ["/search hot leads", "/search downtown properties"],
      };

    case "draft-email":
      if (!context.selectedEntity?.type) {
        return { reply: "Select a lead first to draft an email.", actions: [] };
      }
      return {
        reply: "Email draft ready.",
        actions: [{
          kind: "draft_email",
          payload: {
            leadId: context.selectedEntity.id,
            subject: argString || "Following up",
            body: "Hi,\n\nI wanted to follow up...\n\nBest regards"
          }
        }],
      };

    case "summarize":
      if (!context.selectedEntity?.type) {
        return { reply: "Select an item to summarize.", actions: [] };
      }
      return {
        reply: "Here's a summary of the current item...",
        actions: [{
          kind: "summarize",
          payload: {
            entity: context.selectedEntity.type as "lead" | "deal" | "property",
            id: context.selectedEntity.id
          }
        }],
      };

    default:
      return {
        reply: `Unknown command: /${command}`,
        actions: [],
        followups: ["/add-lead", "/create-task", "/search"],
      };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: AssistantRequest = await request.json();
    const { message, context } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const response = processMessage(message, context || { route: "/" });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Assistant API error:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}

