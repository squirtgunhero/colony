import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const hasPhone = searchParams.get("hasPhone") === "true";
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    if (q.length < 2) {
      return NextResponse.json({ contacts: [] });
    }

    const contacts = await prisma.contact.findMany({
      where: {
        userId,
        ...(hasPhone ? { phone: { not: null } } : {}),
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        type: true,
      },
      orderBy: { name: "asc" },
      take: limit,
    });

    return NextResponse.json({ contacts });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
