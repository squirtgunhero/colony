import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/supabase/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getUser();
  const isLoggedIn = !!user;

  const referral = await prisma.referral.findFirst({
    where: { id, visibility: "public" },
    include: {
      claims: { orderBy: { createdAt: "desc" } },
      messages: {
        where: { visibility: "public", messageType: "comment" },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { claims: true, messages: true } },
    },
  });

  if (!referral) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allUserIds = [
    referral.createdByUserId,
    ...referral.messages.map((m) => m.createdByUserId),
  ];
  const uniqueUserIds = [...new Set(allUserIds)];
  const profiles = await prisma.profile.findMany({
    where: { id: { in: uniqueUserIds } },
    select: { id: true, fullName: true, createdAt: true },
  });
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const creatorProfile = profileMap.get(referral.createdByUserId);
  const hasUserClaimed = user
    ? referral.claims.some((c) => c.claimantUserId === user.id)
    : false;
  const isCreator = user ? referral.createdByUserId === user.id : false;

  return NextResponse.json({
    referral: {
      id: referral.id,
      title: referral.title,
      description: referral.description,
      category: referral.category,
      status: referral.status,
      locationText: referral.locationText,
      valueEstimate: referral.valueEstimate,
      currency: referral.currency,
      createdByName: isLoggedIn
        ? (creatorProfile?.fullName ?? null)
        : (creatorProfile?.fullName?.split(" ")[0] ?? null),
      creatorJoinedAt: creatorProfile?.createdAt ?? null,
      createdAt: referral.createdAt,
      updatedAt: referral.updatedAt,
      claimCount: referral._count.claims,
      messageCount: referral._count.messages,
      comments: referral.messages.map((m) => {
        const profile = profileMap.get(m.createdByUserId);
        return {
          id: m.id,
          bodyText: m.bodyText,
          createdByName: isLoggedIn
            ? (profile?.fullName ?? null)
            : (profile?.fullName?.split(" ")[0] ?? null),
          createdAt: m.createdAt,
        };
      }),
    },
    isLoggedIn,
    hasUserClaimed,
    isCreator,
  });
}
