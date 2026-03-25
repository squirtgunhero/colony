import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// GET — list text campaigns
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaigns = await prisma.textCampaign.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(campaigns);
}

// POST — create a new text campaign
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, message, contactIds, scheduledAt } = body;

  if (!name || !message) {
    return NextResponse.json({ error: "name and message required" }, { status: 400 });
  }

  if (!contactIds?.length) {
    return NextResponse.json({ error: "At least one contact required" }, { status: 400 });
  }

  // Fetch contacts with phone numbers
  const contacts = await prisma.contact.findMany({
    where: { id: { in: contactIds }, userId: user.id, phone: { not: null } },
    select: { id: true, phone: true },
  });

  if (contacts.length === 0) {
    return NextResponse.json({ error: "No contacts with phone numbers found" }, { status: 400 });
  }

  const campaign = await prisma.textCampaign.create({
    data: {
      userId: user.id,
      name,
      message,
      status: scheduledAt ? "scheduled" : "draft",
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      recipientCount: contacts.length,
      recipients: {
        create: contacts.map((c) => ({
          contactId: c.id,
          phone: c.phone!,
        })),
      },
    },
  });

  return NextResponse.json(campaign, { status: 201 });
}
