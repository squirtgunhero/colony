import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

/**
 * GET — Generate a pre-call briefing for a contact.
 * Returns contact details, recent activity, last calls, open deals, and a summary.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const contactId = request.nextUrl.searchParams.get("contactId");
    if (!contactId) {
      return NextResponse.json({ error: "contactId required" }, { status: 400 });
    }

    const [contact, activities, recentCalls, deals] = await Promise.all([
      prisma.contact.findFirst({
        where: { id: contactId, userId },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          type: true,
          tags: true,
          source: true,
          notes: true,
          leadScore: true,
          leadGrade: true,
          lastContactedAt: true,
          createdAt: true,
        },
      }),

      prisma.activity.findMany({
        where: { contactId, userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          type: true,
          title: true,
          description: true,
          createdAt: true,
        },
      }),

      prisma.call.findMany({
        where: { contactId, userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          status: true,
          outcome: true,
          duration: true,
          notes: true,
          aiSummary: true,
          isVoiceAI: true,
          createdAt: true,
        },
      }),

      prisma.deal.findMany({
        where: { contactId, userId },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          title: true,
          value: true,
          stage: true,
        },
      }),
    ]);

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Build a text briefing from the data
    const lines: string[] = [];

    // Contact summary
    lines.push(`${contact.name} is a ${contact.type}${contact.source ? ` from ${contact.source.replace(/_/g, " ")}` : ""}.`);

    if (contact.tags.length > 0) {
      lines.push(`Tags: ${contact.tags.join(", ")}.`);
    }

    if (contact.leadScore) {
      lines.push(`Lead score: ${contact.leadScore}${contact.leadGrade ? ` (${contact.leadGrade})` : ""}.`);
    }

    // Last contact
    if (contact.lastContactedAt) {
      const daysAgo = Math.floor((Date.now() - new Date(contact.lastContactedAt).getTime()) / 86400000);
      lines.push(`Last contacted ${daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo} days ago`}.`);
    } else {
      lines.push("Never contacted before.");
    }

    // Recent call summary
    if (recentCalls.length > 0) {
      const lastCall = recentCalls[0];
      const outcomeStr = lastCall.outcome?.replace(/_/g, " ") || lastCall.status;
      lines.push(`Last call: ${outcomeStr}${lastCall.duration ? ` (${Math.floor(lastCall.duration / 60)}m ${lastCall.duration % 60}s)` : ""}.`);
      if (lastCall.aiSummary) {
        lines.push(lastCall.aiSummary);
      } else if (lastCall.notes) {
        lines.push(lastCall.notes);
      }
    } else {
      lines.push("No prior calls.");
    }

    // Open deals
    if (deals.length > 0) {
      const dealSummaries = deals.map((d) => `${d.title} (${d.stage}${d.value ? `, $${d.value.toLocaleString()}` : ""})`);
      lines.push(`Open deals: ${dealSummaries.join("; ")}.`);
    }

    // Contact notes
    if (contact.notes) {
      lines.push(`Notes: ${contact.notes.slice(0, 300)}`);
    }

    return NextResponse.json({
      contact,
      activities: activities.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      })),
      recentCalls: recentCalls.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      })),
      deals,
      briefing: lines.join(" "),
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate briefing" }, { status: 500 });
  }
}
