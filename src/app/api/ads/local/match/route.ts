import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/supabase/auth";

export async function POST() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { businessType: true },
    });

    const myCategory = profile?.businessType?.toLowerCase().replace(/\s+/g, "_") || "other";

    const myCampaign = await prisma.honeycombCampaign.findFirst({
      where: { userId: user.id, channel: "local", status: "active" },
    });

    const myServiceArea = myCampaign?.metadata
      ? (myCampaign.metadata as Record<string, unknown>).serviceArea as string || ""
      : "";

    const otherLocalCampaigns = await prisma.honeycombCampaign.findMany({
      where: {
        channel: "local",
        status: "active",
        userId: { not: user.id },
      },
      select: { userId: true, metadata: true },
      distinct: ["userId"],
    });

    const existingPairs = await prisma.localExchangePair.findMany({
      where: {
        OR: [{ userAId: user.id }, { userBId: user.id }],
      },
    });

    const pairedUserIds = new Set(
      existingPairs.map((p) =>
        p.userAId === user.id ? p.userBId : p.userAId
      )
    );

    const newPairs: Array<{
      userAId: string;
      userBId: string;
      userACategory: string;
      userBCategory: string;
    }> = [];

    // Batch fetch all profiles to avoid N+1 queries
    const candidateUserIds = otherLocalCampaigns
      .filter((c) => !pairedUserIds.has(c.userId))
      .map((c) => c.userId);

    const profiles = candidateUserIds.length > 0
      ? await prisma.profile.findMany({
          where: { id: { in: candidateUserIds } },
          select: { id: true, businessType: true },
        })
      : [];

    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    for (const campaign of otherLocalCampaigns) {
      if (pairedUserIds.has(campaign.userId)) continue;

      const otherProfile = profileMap.get(campaign.userId);
      const otherCategory =
        otherProfile?.businessType?.toLowerCase().replace(/\s+/g, "_") || "other";

      if (otherCategory.toLowerCase() === myCategory.toLowerCase()) continue;

      if (myServiceArea) {
        const otherServiceArea =
          (campaign.metadata as Record<string, unknown>)?.serviceArea as string || "";
        if (
          otherServiceArea &&
          !otherServiceArea.toLowerCase().includes(myServiceArea.toLowerCase()) &&
          !myServiceArea.toLowerCase().includes(otherServiceArea.toLowerCase())
        ) {
          continue;
        }
      }

      newPairs.push({
        userAId: user.id,
        userBId: campaign.userId,
        userACategory: myCategory,
        userBCategory: otherCategory,
      });
    }

    if (newPairs.length > 0) {
      await prisma.localExchangePair.createMany({
        data: newPairs.map((p) => ({
          ...p,
          status: "proposed",
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      matched: newPairs.length,
      pairs: newPairs.map((p) => ({
        partnerId: p.userBId,
        partnerCategory: p.userBCategory,
        status: "proposed",
      })),
    });
  } catch (error) {
    console.error("Local match error:", error);
    return NextResponse.json(
      { error: "Failed to find matches" },
      { status: 500 }
    );
  }
}
