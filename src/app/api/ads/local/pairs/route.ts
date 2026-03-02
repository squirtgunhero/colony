import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/supabase/auth";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pairs = await prisma.localExchangePair.findMany({
      where: {
        OR: [{ userAId: user.id }, { userBId: user.id }],
      },
      orderBy: { createdAt: "desc" },
    });

    const partnerIds = pairs.map((p) =>
      p.userAId === user.id ? p.userBId : p.userAId
    );

    const partners = await prisma.profile.findMany({
      where: { id: { in: partnerIds } },
      select: { id: true, fullName: true, businessType: true },
    });

    const partnerMap = new Map(partners.map((p) => [p.id, p]));

    return NextResponse.json({
      pairs: pairs.map((p) => {
        const partnerId = p.userAId === user.id ? p.userBId : p.userAId;
        const partner = partnerMap.get(partnerId);
        return {
          id: p.id,
          partnerId,
          partnerName: partner?.fullName || "Unknown",
          partnerCategory: partner?.businessType || "other",
          myCategory: p.userAId === user.id ? p.userACategory : p.userBCategory,
          status: p.status,
          createdAt: p.createdAt.toISOString(),
        };
      }),
    });
  } catch (error) {
    console.error("Get pairs error:", error);
    return NextResponse.json(
      { error: "Failed to get pairs" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { pairId, action } = body as { pairId: string; action: string };

    if (!pairId || !action) {
      return NextResponse.json(
        { error: "pairId and action are required" },
        { status: 400 }
      );
    }

    const pair = await prisma.localExchangePair.findUnique({
      where: { id: pairId },
    });

    if (!pair) {
      return NextResponse.json({ error: "Pair not found" }, { status: 404 });
    }

    if (pair.userAId !== user.id && pair.userBId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const statusMap: Record<string, string> = {
      accept: "active",
      decline: "ended",
      pause: "paused",
      resume: "active",
    };

    const newStatus = statusMap[action];
    if (!newStatus) {
      return NextResponse.json(
        { error: "Invalid action. Use: accept, decline, pause, resume" },
        { status: 400 }
      );
    }

    const updated = await prisma.localExchangePair.update({
      where: { id: pairId },
      data: { status: newStatus },
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
    });
  } catch (error) {
    console.error("Update pair error:", error);
    return NextResponse.json(
      { error: "Failed to update pair" },
      { status: 500 }
    );
  }
}
