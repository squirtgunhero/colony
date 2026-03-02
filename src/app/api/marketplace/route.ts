import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/supabase/auth";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category");
  const location = searchParams.get("location");
  const search = searchParams.get("search");
  const status = searchParams.get("status") ?? "open";
  const sort = searchParams.get("sort") ?? "newest";
  const cursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);

  const user = await getUser();
  const isLoggedIn = !!user;

  const where: Prisma.ReferralWhereInput = { visibility: "public" };

  if (status && status !== "all") {
    where.status = status;
  }
  if (category && category !== "all") {
    where.category = category;
  }
  if (location) {
    where.locationText = { contains: location, mode: "insensitive" };
  }
  if (search) {
    where.AND = [
      {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      },
    ];
  }

  let orderBy: Prisma.ReferralOrderByWithRelationInput;
  switch (sort) {
    case "value":
      orderBy = { valueEstimate: "desc" };
      break;
    case "active":
      orderBy = { updatedAt: "desc" };
      break;
    default:
      orderBy = { createdAt: "desc" };
  }

  const [referrals, totalOpen, totalClaimed, totalValueAgg, distinctCategories] =
    await Promise.all([
      prisma.referral.findMany({
        where,
        take: limit + 1,
        orderBy,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: {
          _count: { select: { claims: true, messages: true } },
        },
      }),
      prisma.referral.count({ where: { visibility: "public", status: "open" } }),
      prisma.referral.count({
        where: {
          visibility: "public",
          status: { in: ["claimed", "assigned", "closed"] },
        },
      }),
      prisma.referral.aggregate({
        where: { visibility: "public" },
        _sum: { valueEstimate: true },
      }),
      prisma.referral.findMany({
        where: { visibility: "public", status: "open" },
        select: { category: true },
        distinct: ["category"],
      }),
    ]);

  const creatorIds = [...new Set(referrals.map((r) => r.createdByUserId))];
  const profiles = creatorIds.length
    ? await prisma.profile.findMany({
        where: { id: { in: creatorIds } },
        select: { id: true, fullName: true },
      })
    : [];
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const hasNextPage = referrals.length > limit;
  const items = hasNextPage ? referrals.slice(0, limit) : referrals;

  return NextResponse.json({
    stats: {
      totalOpen,
      totalCategories: distinctCategories.length,
      totalClaimed,
      totalValue: totalValueAgg._sum.valueEstimate ?? 0,
    },
    referrals: items.map((r) => {
      const profile = profileMap.get(r.createdByUserId);
      const fullName = profile?.fullName ?? null;
      return {
        id: r.id,
        title: r.title,
        description: r.description,
        category: r.category,
        status: r.status,
        locationText: r.locationText,
        valueEstimate: r.valueEstimate,
        currency: r.currency,
        createdByName: isLoggedIn
          ? fullName
          : (fullName?.split(" ")[0] ?? null),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        claimCount: r._count.claims,
        messageCount: r._count.messages,
        isLoggedIn,
      };
    }),
    nextCursor: hasNextPage ? items[items.length - 1].id : null,
  });
}
