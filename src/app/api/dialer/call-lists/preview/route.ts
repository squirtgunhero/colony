import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { buildWhereClause } from "@/lib/dialer/smart-list-filters";
import type { SmartFilter } from "@/lib/dialer/smart-list-filters";

/**
 * POST — Preview how many contacts match a smart list filter.
 * Returns count + sample contacts.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const { filters } = (await request.json()) as { filters: SmartFilter[] };

    const where = buildWhereClause(userId, filters);

    const [count, contacts] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.findMany({
        where,
        select: {
          id: true,
          name: true,
          phone: true,
          type: true,
          leadScore: true,
          leadGrade: true,
        },
        orderBy: { name: "asc" },
        take: 10,
      }),
    ]);

    return NextResponse.json({ count, contacts });
  } catch {
    return NextResponse.json({ error: "Failed to preview" }, { status: 500 });
  }
}
