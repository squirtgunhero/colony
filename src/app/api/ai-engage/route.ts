import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// GET — list all AI engagements for the current user
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const engagements = await prisma.aIEngagement.findMany({
    where: { userId: user.id },
    include: {
      contact: { select: { id: true, name: true, email: true, phone: true, source: true, type: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(engagements);
}

// POST — start AI engagement for a contact
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { contactId, channel = "sms", objective = "qualify" } = body;

  if (!contactId) {
    return NextResponse.json({ error: "contactId required" }, { status: 400 });
  }

  // Verify contact belongs to user
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId: user.id },
  });
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  if (channel === "sms" && !contact.phone) {
    return NextResponse.json({ error: "Contact has no phone number" }, { status: 400 });
  }
  if (channel === "email" && !contact.email) {
    return NextResponse.json({ error: "Contact has no email" }, { status: 400 });
  }

  // Check for existing engagement
  const existing = await prisma.aIEngagement.findUnique({
    where: { userId_contactId_channel: { userId: user.id, contactId, channel } },
  });

  if (existing) {
    // Reactivate if paused/unresponsive
    if (["paused", "unresponsive"].includes(existing.status)) {
      const updated = await prisma.aIEngagement.update({
        where: { id: existing.id },
        data: { status: "active", nextFollowUp: new Date() },
      });
      return NextResponse.json(updated);
    }
    return NextResponse.json({ error: "Engagement already exists", engagement: existing }, { status: 409 });
  }

  const engagement = await prisma.aIEngagement.create({
    data: {
      userId: user.id,
      contactId,
      channel,
      aiObjective: objective,
      status: "active",
      nextFollowUp: new Date(), // Process immediately
    },
  });

  return NextResponse.json(engagement, { status: 201 });
}
