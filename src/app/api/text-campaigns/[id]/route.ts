import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET — single campaign with recipients
export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaign = await prisma.textCampaign.findFirst({
    where: { id, userId: user.id },
    include: {
      recipients: {
        include: { contact: { select: { id: true, name: true, phone: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(campaign);
}

// PATCH — update campaign or trigger send
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaign = await prisma.textCampaign.findFirst({
    where: { id, userId: user.id },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const { action, name, message } = body;

  // Trigger send
  if (action === "send") {
    if (!["draft", "scheduled", "paused"].includes(campaign.status)) {
      return NextResponse.json({ error: "Campaign cannot be sent in current status" }, { status: 400 });
    }

    await prisma.textCampaign.update({
      where: { id },
      data: { status: "sending", startedAt: new Date() },
    });

    // Send messages asynchronously
    sendCampaignMessages(id, user.id).catch(console.error);

    return NextResponse.json({ ok: true, status: "sending" });
  }

  // Pause
  if (action === "pause") {
    await prisma.textCampaign.update({
      where: { id },
      data: { status: "paused" },
    });
    return NextResponse.json({ ok: true, status: "paused" });
  }

  // Update draft
  const updateData: Record<string, unknown> = {};
  if (name) updateData.name = name;
  if (message) updateData.message = message;

  const updated = await prisma.textCampaign.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}

// DELETE
export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaign = await prisma.textCampaign.findFirst({
    where: { id, userId: user.id },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.textCampaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// Background: send campaign messages with rate limiting
async function sendCampaignMessages(campaignId: string, userId: string) {
  const { sendSMS } = await import("@/lib/twilio");

  const recipients = await prisma.textCampaignRecipient.findMany({
    where: { campaignId, status: "pending" },
    include: { contact: { select: { name: true } } },
  });

  const campaign = await prisma.textCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return;

  let sentCount = campaign.sentCount;
  let failedCount = campaign.failedCount;

  for (const recipient of recipients) {
    // Check if paused
    const current = await prisma.textCampaign.findUnique({ where: { id: campaignId } });
    if (current?.status === "paused") break;

    try {
      // Personalize message
      const firstName = recipient.contact.name.split(" ")[0];
      const personalizedMessage = campaign.message
        .replace(/\{\{name\}\}/g, recipient.contact.name)
        .replace(/\{\{first_name\}\}/g, firstName);

      const result = await sendSMS(recipient.phone, personalizedMessage);

      await prisma.textCampaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "sent",
          sentAt: new Date(),
          twilioSid: result.sid,
        },
      });

      // Also log as SMSMessage
      await prisma.sMSMessage.create({
        data: {
          profileId: userId,
          direction: "outbound",
          from: process.env.TWILIO_PHONE_NUMBER!,
          to: recipient.phone,
          body: personalizedMessage,
          twilioSid: result.sid,
          status: "sent",
        },
      });

      sentCount++;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      await prisma.textCampaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "failed", errorMessage: errMsg },
      });
      failedCount++;
    }

    // Update running totals
    await prisma.textCampaign.update({
      where: { id: campaignId },
      data: { sentCount, failedCount },
    });

    // Rate limit: 1 message per second
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Mark complete
  await prisma.textCampaign.update({
    where: { id: campaignId },
    data: {
      status: "completed",
      completedAt: new Date(),
      sentCount,
      failedCount,
    },
  });
}
