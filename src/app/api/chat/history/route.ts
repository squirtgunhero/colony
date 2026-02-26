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

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const messages = await prisma.conversationMessage.findMany({
    where: {
      conv: { profileId: user.id },
      createdAt: { gte: todayStart },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: {
      id: true,
      role: true,
      content: true,
      channel: true,
      lamRunId: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ messages });
}
