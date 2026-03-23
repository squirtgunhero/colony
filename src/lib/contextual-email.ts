/**
 * Context-Aware Email Drafting
 *
 * Generates personalized email drafts using contact history,
 * deal context, inbox messages, and user profile.
 */

import { prisma } from "./prisma";
import { getDefaultProvider } from "@/lam/llm";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DraftResult {
  subject: string;
  body: string;
  context_used: string[];
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function draftContextualEmail(
  contactId: string,
  userId: string,
  purpose?: string
): Promise<DraftResult> {
  // Parallel fetch all context
  const [contact, activities, deals, messages, profile] = await Promise.all([
    prisma.contact.findUnique({
      where: { id: contactId },
      select: {
        name: true,
        email: true,
        phone: true,
        type: true,
        source: true,
        tags: true,
        notes: true,
        lastContactedAt: true,
      },
    }),
    prisma.activity.findMany({
      where: { contactId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { type: true, title: true, description: true, createdAt: true },
    }),
    prisma.deal.findMany({
      where: { contactId, userId },
      orderBy: { updatedAt: "desc" },
      take: 3,
      select: { title: true, value: true, stage: true, expectedCloseDate: true },
    }),
    prisma.inboxMessage.findMany({
      where: { thread: { contactId } },
      orderBy: { occurredAt: "desc" },
      take: 5,
      select: { direction: true, subject: true, bodyText: true, occurredAt: true },
    }),
    prisma.profile.findUnique({
      where: { id: userId },
      select: { fullName: true, businessType: true, serviceAreaCity: true },
    }),
  ]);

  if (!contact) throw new Error("Contact not found");

  // Track which context sources had data
  const context_used: string[] = ["contact"];
  if (activities.length > 0) context_used.push("activities");
  if (deals.length > 0) context_used.push("deals");
  if (messages.length > 0) context_used.push("inbox_messages");
  if (profile) context_used.push("profile");

  // Build context sections
  const sections: string[] = [];

  if (profile) {
    sections.push(
      `Agent: ${profile.fullName || "Agent"}, ${profile.businessType || "real estate"} in ${profile.serviceAreaCity || "your area"}`
    );
  }

  sections.push(
    `Recipient: ${contact.name} (${contact.type || "contact"})` +
      (contact.source ? `, source: ${contact.source}` : "") +
      (contact.lastContactedAt
        ? `, last contacted: ${contact.lastContactedAt.toLocaleDateString()}`
        : ", never contacted")
  );

  if (contact.tags && (contact.tags as string[]).length > 0) {
    sections.push(`Tags: ${(contact.tags as string[]).join(", ")}`);
  }
  if (contact.notes) {
    sections.push(`Notes: ${contact.notes.substring(0, 300)}`);
  }

  if (activities.length > 0) {
    sections.push("Recent interactions:");
    for (const a of activities) {
      sections.push(
        `  - [${a.createdAt.toLocaleDateString()}] ${a.type}: ${a.title}${a.description ? ` — ${a.description.substring(0, 100)}` : ""}`
      );
    }
  }

  if (deals.length > 0) {
    sections.push("Active deals:");
    for (const d of deals) {
      sections.push(
        `  - ${d.title} (${d.stage}${d.value ? `, $${d.value.toLocaleString()}` : ""}${d.expectedCloseDate ? `, closing ${d.expectedCloseDate.toLocaleDateString()}` : ""})`
      );
    }
  }

  if (messages.length > 0) {
    sections.push("Recent messages:");
    for (const m of messages) {
      const snippet = m.bodyText?.substring(0, 150) || "(no text)";
      sections.push(
        `  - [${m.occurredAt?.toLocaleDateString() ?? "?"}] ${m.direction === "outbound" ? "Sent" : "Received"}: ${m.subject || "(no subject)"} — ${snippet}`
      );
    }
  }

  const contextBlock = sections.join("\n");

  // LLM call
  const llm = getDefaultProvider();
  const response = await llm.complete(
    [
      {
        role: "system",
        content: `You are a real estate agent's email assistant. Draft a personalized email using the context below. The email should feel warm, professional, and reference specific details from the contact's history. Return ONLY a JSON object with "subject" and "body" fields. The body should be HTML.`,
      },
      {
        role: "user",
        content: `${contextBlock}\n\nPurpose: ${purpose || "general follow-up — check in, maintain relationship, offer value"}\n\nGenerate the email as JSON: { "subject": "...", "body": "<html>...</html>" }`,
      },
    ],
    { temperature: 0.7, maxTokens: 1500 }
  );

  // Parse response
  try {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        subject: parsed.subject || `Following up, ${contact.name}`,
        body: parsed.body || response.content,
        context_used,
      };
    }
  } catch {
    // Fallback
  }

  return {
    subject: `Following up, ${contact.name}`,
    body: response.content,
    context_used,
  };
}
