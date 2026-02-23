import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [tasksDueToday, overdueTasks, recentActivities, dealChanges] =
    await Promise.all([
      prisma.task.findMany({
        where: {
          userId,
          completed: false,
          dueDate: { gte: todayStart, lte: todayEnd },
        },
        include: { contact: { select: { id: true, name: true } } },
        orderBy: { dueDate: "asc" },
        take: 10,
      }),

      prisma.task.findMany({
        where: {
          userId,
          completed: false,
          dueDate: { lt: todayStart },
        },
        include: { contact: { select: { id: true, name: true } } },
        orderBy: { dueDate: "asc" },
        take: 5,
      }),

      prisma.activity.findMany({
        where: {
          userId,
          createdAt: { gte: todayStart },
        },
        include: {
          contact: { select: { id: true, name: true } },
          deal: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      prisma.activity.findMany({
        where: {
          userId,
          type: "deal_update",
          createdAt: { gte: todayStart },
        },
        include: {
          deal: { select: { id: true, title: true, stage: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  return NextResponse.json({
    tasksDueToday: tasksDueToday.map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate,
      priority: t.priority,
      contact: t.contact,
    })),
    overdueTasks: overdueTasks.map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate,
      priority: t.priority,
      contact: t.contact,
    })),
    recentActivities: recentActivities.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      description: a.description,
      createdAt: a.createdAt,
      contact: a.contact,
      deal: a.deal,
    })),
    dealChanges: dealChanges.map((a) => ({
      id: a.id,
      title: a.title,
      deal: a.deal,
      createdAt: a.createdAt,
    })),
  });
}
