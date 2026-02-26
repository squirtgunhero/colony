import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSMS } from "@/lib/twilio";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const autopilotUsers = await prisma.userPhone.findMany({
    where: { autopilotEnabled: true, verified: true },
    include: { profile: true },
  });

  if (autopilotUsers.length === 0) {
    return Response.json({ sent: 0 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  let sent = 0;

  for (const userPhone of autopilotUsers) {
    const userId = userPhone.profileId;

    try {
      const digest = await buildDigest(userId, todayStart, weekAgo);
      if (!digest) continue;

      const truncated =
        digest.length > 480 ? digest.slice(0, 477) + "..." : digest;

      const result = await sendSMS(userPhone.phoneNumber, truncated);

      await prisma.sMSMessage.create({
        data: {
          profileId: userId,
          direction: "outbound",
          from: process.env.TWILIO_PHONE_NUMBER!,
          to: userPhone.phoneNumber,
          body: truncated,
          twilioSid: result.sid,
          status: "sent",
        },
      });

      sent++;
    } catch (error) {
      console.error(`Daily digest failed for user ${userId}:`, error);
    }
  }

  return Response.json({ sent, total: autopilotUsers.length });
}

async function buildDigest(
  userId: string,
  todayStart: Date,
  weekAgo: Date
): Promise<string | null> {
  const [newContacts, stageChanges, newClaims, overdueTasks, pipeline, pipelineWeekAgo, metaAccount] =
    await Promise.all([
      prisma.contact.findMany({
        where: { userId, createdAt: { gte: todayStart } },
        select: { name: true },
        take: 10,
      }),
      prisma.activity.findMany({
        where: {
          userId,
          type: "deal_update",
          createdAt: { gte: todayStart },
        },
        include: { deal: { select: { title: true, stage: true } } },
        take: 10,
      }),
      prisma.referralClaim.findMany({
        where: {
          referral: { createdByUserId: userId },
          createdAt: { gte: todayStart },
        },
        include: {
          referral: { select: { title: true, category: true } },
        },
        take: 10,
      }),
      prisma.task.findMany({
        where: {
          userId,
          completed: false,
          dueDate: { lt: new Date() },
        },
        select: { title: true, dueDate: true },
        take: 10,
      }),
      prisma.deal.aggregate({
        where: {
          userId,
          stage: { not: "closed" },
        },
        _sum: { value: true },
      }),
      prisma.deal.aggregate({
        where: {
          userId,
          stage: { not: "closed" },
          createdAt: { lte: weekAgo },
        },
        _sum: { value: true },
      }),
      prisma.metaAdAccount.findFirst({
        where: { userId, status: "active" },
        include: {
          campaigns: {
            where: { status: "ACTIVE" },
            select: { name: true, spend: true, clicks: true, impressions: true, conversions: true },
          },
        },
      }),
    ]);

  const parts: string[] = [];

  if (newContacts.length > 0) {
    const names = newContacts.slice(0, 3).map((c) => c.name);
    const extra =
      newContacts.length > 3 ? ` +${newContacts.length - 3} more` : "";
    parts.push(`${newContacts.length} new contact(s): ${names.join(", ")}${extra}.`);
  }

  if (stageChanges.length > 0) {
    const lines = stageChanges.slice(0, 3).map((a) => {
      const label = stageLabel(a.deal?.stage ?? "");
      return `${a.deal?.title ?? "A deal"} moved to ${label}`;
    });
    parts.push(lines.join(". ") + ".");
  }

  if (newClaims.length > 0) {
    parts.push(
      `${newClaims.length} new referral claim(s) on your listings.`
    );
  }

  if (overdueTasks.length > 0) {
    parts.push(`${overdueTasks.length} overdue task(s) need attention.`);
  }

  if (parts.length === 0) return null;

  const currentPipeline = pipeline._sum.value ?? 0;
  const oldPipeline = pipelineWeekAgo._sum.value ?? 0;

  let pipelineLine = `Pipeline: $${formatK(currentPipeline)}`;
  if (oldPipeline > 0) {
    const pctChange = Math.round(
      ((currentPipeline - oldPipeline) / oldPipeline) * 100
    );
    const dir = pctChange >= 0 ? "Up" : "Down";
    pipelineLine += `. ${dir} ${Math.abs(pctChange)}% from last week`;
  }
  pipelineLine += ".";

  if (metaAccount && metaAccount.campaigns.length > 0) {
    const totalSpend = metaAccount.campaigns.reduce((s, c) => s + c.spend, 0);
    const totalLeads = metaAccount.campaigns.reduce((s, c) => s + c.conversions, 0);
    const totalClicks = metaAccount.campaigns.reduce((s, c) => s + c.clicks, 0);
    if (totalSpend > 0) {
      parts.push(`Ads: $${totalSpend.toFixed(0)} spent, ${totalLeads} lead${totalLeads !== 1 ? "s" : ""}, ${totalClicks} clicks.`);
    }
  }

  const header = `Hey, it's Tara. ${parts.length} thing${parts.length > 1 ? "s" : ""} for you today.`;

  return [header, ...parts, pipelineLine].join("\n");
}

function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    new_lead: "New Lead",
    qualified: "Qualified",
    showing: "Showing",
    offer: "Offer",
    negotiation: "Negotiation",
    closed: "Closed",
  };
  return map[stage] ?? stage;
}

function formatK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toLocaleString();
}
