import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/supabase/auth";
import { MarketplaceDetailView } from "./detail-view";
import type { MarketplaceReferral } from "@/components/marketplace/marketplace-referral-card";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const CATEGORY_LABELS: Record<string, string> = {
  real_estate: "Real Estate",
  plumbing: "Plumbing",
  electrical: "Electrical",
  finance: "Finance",
  legal: "Legal",
  insurance: "Insurance",
  contractor: "Contractor",
  landscaping: "Landscaping",
  cleaning: "Cleaning",
  moving: "Moving",
  other: "Other",
};

async function getPublicReferral(id: string) {
  return prisma.referral.findFirst({
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
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const referral = await getPublicReferral(id);

  if (!referral) {
    return { title: "Not Found | Colony Marketplace" };
  }

  const categoryLabel =
    CATEGORY_LABELS[referral.category] ?? referral.category;
  const description =
    referral.description ??
    `${categoryLabel} referral opportunity on Colony Marketplace`;

  return {
    title: `${referral.title} | Colony Marketplace`,
    description,
    openGraph: {
      title: `${referral.title} | Colony Marketplace`,
      description,
      type: "article",
    },
  };
}

export default async function MarketplaceDetailPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const autoOpenClaim = resolvedSearchParams.claim === "true";

  const [referral, user] = await Promise.all([
    getPublicReferral(id),
    getUser(),
  ]);

  if (!referral) notFound();

  if (user && referral.createdByUserId === user.id) {
    redirect(`/referrals/${id}`);
  }

  const isLoggedIn = !!user;

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
  const userClaimStatus = user
    ? (referral.claims.find((c) => c.claimantUserId === user.id)?.status ??
      null)
    : null;

  const serializedReferral = {
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
    creatorJoinedAt: creatorProfile?.createdAt?.toISOString() ?? null,
    createdAt: referral.createdAt.toISOString(),
    updatedAt: referral.updatedAt.toISOString(),
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
        createdAt: m.createdAt.toISOString(),
      };
    }),
  };

  // Related referrals (same category or location)
  const relatedReferrals = await prisma.referral.findMany({
    where: {
      visibility: "public",
      status: "open",
      id: { not: referral.id },
      OR: [
        { category: referral.category },
        ...(referral.locationText
          ? [
              {
                locationText: {
                  contains:
                    referral.locationText.split(",")[0]?.trim() ?? "",
                  mode: "insensitive" as const,
                },
              },
            ]
          : []),
      ],
    },
    take: 3,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { claims: true, messages: true } } },
  });

  const relatedCreatorIds = relatedReferrals.map((r) => r.createdByUserId);
  const relatedProfiles = relatedCreatorIds.length
    ? await prisma.profile.findMany({
        where: { id: { in: relatedCreatorIds } },
        select: { id: true, fullName: true },
      })
    : [];
  const relatedProfileMap = new Map(
    relatedProfiles.map((p) => [p.id, p])
  );

  const serializedRelated: MarketplaceReferral[] = relatedReferrals.map(
    (r) => {
      const profile = relatedProfileMap.get(r.createdByUserId);
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
          ? (profile?.fullName ?? null)
          : (profile?.fullName?.split(" ")[0] ?? null),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        claimCount: r._count.claims,
        messageCount: r._count.messages,
        isLoggedIn,
      };
    }
  );

  return (
    <MarketplaceDetailView
      referral={serializedReferral}
      relatedReferrals={serializedRelated}
      isLoggedIn={isLoggedIn}
      hasUserClaimed={hasUserClaimed}
      userClaimStatus={userClaimStatus}
      autoOpenClaim={autoOpenClaim}
    />
  );
}
