import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ count: 0 });
  }

  try {
    // Count open threads where the user hasn't read the latest message
    const unreadThreads = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint as count
      FROM "InboxThread" t
      LEFT JOIN "InboxParticipant" p ON p."threadId" = t.id AND p."userId" = ${user.id}::uuid
      WHERE t.status = 'open'
        AND (p."lastReadAt" IS NULL OR p."lastReadAt" < t."lastMessageAt")
    `;
    const count = Number(unreadThreads[0]?.count ?? 0);
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
