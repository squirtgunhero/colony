import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all web conversations for this user
  const convos = await prisma.conversation.findMany({
    where: { profileId: user.id, channel: "web" },
    select: { id: true },
  });

  const convIds = convos.map((c) => c.id);

  if (convIds.length > 0) {
    // Delete messages first (cascade would handle it, but be explicit)
    await prisma.conversationMessage.deleteMany({
      where: { convId: { in: convIds } },
    });

    // Delete the conversations themselves
    await prisma.conversation.deleteMany({
      where: { id: { in: convIds } },
    });
  }

  return NextResponse.json({ success: true });
}

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
