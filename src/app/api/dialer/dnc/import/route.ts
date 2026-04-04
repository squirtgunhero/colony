import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const { numbers } = await request.json();

    if (!Array.isArray(numbers) || numbers.length === 0) {
      return NextResponse.json({ error: "An array of phone numbers is required" }, { status: 400 });
    }

    if (numbers.length > 10000) {
      return NextResponse.json({ error: "Maximum 10,000 numbers per import" }, { status: 400 });
    }

    const cleaned = numbers
      .map((n: unknown) => (typeof n === "string" ? n.replace(/[^\d+]/g, "") : ""))
      .filter((n: string) => n.length >= 7);

    const results = await Promise.allSettled(
      cleaned.map((phone: string) =>
        prisma.dNCEntry.upsert({
          where: { userId_phone: { userId, phone } },
          update: { reason: "manual", source: "import" },
          create: { userId, phone, reason: "manual", source: "import" },
        })
      )
    );

    const imported = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({ imported, failed, total: cleaned.length });
  } catch {
    return NextResponse.json({ error: "Failed to import DNC entries" }, { status: 500 });
  }
}
