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

  const [profile, leadsCount, pendingTasks, pipeline] = await Promise.all([
    prisma.profile.findUnique({
      where: { id: userId },
      select: { fullName: true },
    }),
    prisma.contact.count({
      where: { userId, type: "lead" },
    }),
    prisma.task.count({
      where: { userId, completed: false },
    }),
    prisma.deal.aggregate({
      where: { userId, stage: { not: "closed" } },
      _sum: { value: true },
    }),
  ]);

  return NextResponse.json({
    firstName: profile?.fullName?.split(" ")[0] ?? null,
    leadsCount,
    pendingTasks,
    pipelineValue: pipeline._sum.value ?? 0,
  });
}
