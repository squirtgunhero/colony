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

  const now = new Date();
  let sent = 0;

  for (const userPhone of autopilotUsers) {
    const userId = userPhone.profileId;

    try {
      const overdue = await prisma.task.findMany({
        where: {
          userId,
          completed: false,
          dueDate: { lt: now },
        },
        include: {
          contact: { select: { name: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 5,
      });

      if (overdue.length === 0) continue;

      const lines = overdue.map((t) => {
        const who = t.contact?.name ?? t.title;
        const ago = daysAgoLabel(t.dueDate!, now);
        return `${who} (${ago})`;
      });

      const noun = overdue.length === 1 ? "overdue follow-up" : "overdue follow-ups";
      let msg = `You have ${overdue.length} ${noun}. ${lines.join(" and ")}.`;

      if (msg.length < 440) {
        msg += " Want me to reach out to them?";
      }

      if (msg.length > 480) {
        msg = msg.slice(0, 477) + "...";
      }

      const result = await sendSMS(userPhone.phoneNumber, msg);

      await prisma.sMSMessage.create({
        data: {
          profileId: userId,
          direction: "outbound",
          from: process.env.TWILIO_PHONE_NUMBER!,
          to: userPhone.phoneNumber,
          body: msg,
          twilioSid: result.sid,
          status: "sent",
        },
      });

      sent++;
    } catch (error) {
      console.error(`Overdue tasks cron failed for user ${userId}:`, error);
    }
  }

  return Response.json({ sent, total: autopilotUsers.length });
}

function daysAgoLabel(dueDate: Date, now: Date): string {
  const diffMs = now.getTime() - dueDate.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days <= 0) return "due today";
  if (days === 1) return "due yesterday";
  return `due ${days} days ago`;
}
