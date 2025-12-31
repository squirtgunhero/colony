/**
 * Referral data access layer
 * User-scoped operations for referrals, claims, and messages
 * 
 * CONCEPT: Conversation lives inside the referral
 * - Public comments visible to all who can see the referral
 * - Private messages visible only to participants
 * - System messages record state changes (claimed, accepted, closed)
 */

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import type { Prisma } from "@prisma/client";

// ============================================================================
// TYPES
// ============================================================================

export type ReferralVisibility = "org" | "network" | "public";
export type ReferralStatus = "open" | "claimed" | "assigned" | "closed";
export type ParticipantRole = "creator" | "claimant" | "collaborator" | "observer";
export type MessageType = "comment" | "system" | "private";
export type MessageVisibility = "public" | "participants_only";
export type ClaimStatus = "requested" | "accepted" | "rejected";

export interface ReferralFilters {
  status?: ReferralStatus;
  category?: string;
  location?: string;
  visibility?: ReferralVisibility;
  createdByMe?: boolean;
  participatingIn?: boolean;
  search?: string;
}

export interface ReferralListItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: ReferralStatus;
  visibility: ReferralVisibility;
  locationText: string | null;
  valueEstimate: number | null;
  currency: string | null;
  createdByUserId: string;
  createdByName: string | null;
  createdByEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
  participantCount: number;
  messageCount: number;
  claimCount: number;
  isParticipant: boolean;
  userRole: ParticipantRole | null;
}

export interface ReferralDetail {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: ReferralStatus;
  visibility: ReferralVisibility;
  locationText: string | null;
  valueEstimate: number | null;
  currency: string | null;
  metadata: Prisma.JsonValue;
  createdByUserId: string;
  createdByName: string | null;
  createdByEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
  participants: ReferralParticipantInfo[];
  claims: ReferralClaimInfo[];
  isCreator: boolean;
  isParticipant: boolean;
  userRole: ParticipantRole | null;
}

export interface ReferralParticipantInfo {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  role: ParticipantRole;
  joinedAt: Date;
}

export interface ReferralClaimInfo {
  id: string;
  claimantUserId: string;
  claimantName: string | null;
  claimantEmail: string | null;
  message: string | null;
  status: ClaimStatus;
  createdAt: Date;
  resolvedAt: Date | null;
}

export interface ReferralMessageInfo {
  id: string;
  createdByUserId: string;
  createdByName: string | null;
  createdByEmail: string | null;
  messageType: MessageType;
  bodyText: string | null;
  bodyHtml: string | null;
  visibility: MessageVisibility;
  metadata: Prisma.JsonValue;
  createdAt: Date;
}

export interface CreateReferralInput {
  title: string;
  description?: string;
  category: string;
  visibility?: ReferralVisibility;
  locationText?: string;
  valueEstimate?: number;
  currency?: string;
  metadata?: Prisma.JsonObject;
}

export interface CreateMessageInput {
  referralId: string;
  messageType?: MessageType;
  bodyText: string;
  bodyHtml?: string;
  visibility?: MessageVisibility;
  metadata?: Prisma.JsonObject;
}

// ============================================================================
// REFERRAL QUERIES
// ============================================================================

/**
 * Get referrals visible to the current user
 * Supports filtering by status, category, location, and visibility
 */
export async function getReferrals(
  filters: ReferralFilters = {},
  cursor?: string,
  limit = 50
): Promise<{ referrals: ReferralListItem[]; nextCursor: string | null }> {
  const userId = await requireUserId();

  const where: Prisma.ReferralWhereInput = {
    OR: [
      // Public referrals visible to everyone
      { visibility: "public" },
      // Created by user
      { createdByUserId: userId },
      // User is a participant
      { participants: { some: { userId } } },
    ],
  };

  // Status filter
  if (filters.status) {
    where.status = filters.status;
  }

  // Category filter
  if (filters.category) {
    where.category = filters.category;
  }

  // Location filter (fuzzy search)
  if (filters.location) {
    where.locationText = {
      contains: filters.location,
      mode: "insensitive",
    };
  }

  // Created by me filter
  if (filters.createdByMe) {
    where.createdByUserId = userId;
    delete where.OR;
  }

  // Participating in filter
  if (filters.participatingIn) {
    where.participants = { some: { userId } };
    delete where.OR;
  }

  // Search filter
  if (filters.search) {
    const searchWhere: Prisma.ReferralWhereInput[] = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
      { category: { contains: filters.search, mode: "insensitive" } },
      { locationText: { contains: filters.search, mode: "insensitive" } },
    ];
    
    if (where.OR) {
      where.AND = [{ OR: where.OR }, { OR: searchWhere }];
      delete where.OR;
    } else {
      where.OR = searchWhere;
    }
  }

  const referrals = await prisma.referral.findMany({
    where,
    take: limit + 1,
    orderBy: { updatedAt: "desc" },
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      participants: {
        where: { userId },
        select: { role: true },
      },
      _count: {
        select: {
          participants: true,
          messages: true,
          claims: true,
        },
      },
    },
  });

  // Get creator profiles
  const creatorIds = [...new Set(referrals.map((r) => r.createdByUserId))];
  const profiles = await prisma.profile.findMany({
    where: { id: { in: creatorIds } },
    select: { id: true, fullName: true, email: true },
  });
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const hasNextPage = referrals.length > limit;
  const referralsToReturn = hasNextPage ? referrals.slice(0, limit) : referrals;

  const referralList: ReferralListItem[] = referralsToReturn.map((r) => {
    const creatorProfile = profileMap.get(r.createdByUserId);
    const userParticipant = r.participants[0];

    return {
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      status: r.status as ReferralStatus,
      visibility: r.visibility as ReferralVisibility,
      locationText: r.locationText,
      valueEstimate: r.valueEstimate,
      currency: r.currency,
      createdByUserId: r.createdByUserId,
      createdByName: creatorProfile?.fullName ?? null,
      createdByEmail: creatorProfile?.email ?? null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      participantCount: r._count.participants,
      messageCount: r._count.messages,
      claimCount: r._count.claims,
      isParticipant: !!userParticipant || r.createdByUserId === userId,
      userRole: userParticipant?.role as ParticipantRole ?? (r.createdByUserId === userId ? "creator" : null),
    };
  });

  return {
    referrals: referralList,
    nextCursor: hasNextPage ? referralsToReturn[referralsToReturn.length - 1].id : null,
  };
}

/**
 * Get a single referral with full details
 */
export async function getReferralDetail(referralId: string): Promise<ReferralDetail | null> {
  const userId = await requireUserId();

  const referral = await prisma.referral.findFirst({
    where: {
      id: referralId,
      OR: [
        { visibility: "public" },
        { createdByUserId: userId },
        { participants: { some: { userId } } },
      ],
    },
    include: {
      participants: true,
      claims: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!referral) return null;

  // Get all user profiles for participants, claims, and creator
  const allUserIds = [
    referral.createdByUserId,
    ...referral.participants.map((p) => p.userId),
    ...referral.claims.map((c) => c.claimantUserId),
  ];
  const uniqueUserIds = [...new Set(allUserIds)];
  
  const profiles = await prisma.profile.findMany({
    where: { id: { in: uniqueUserIds } },
    select: { id: true, fullName: true, email: true },
  });
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const creatorProfile = profileMap.get(referral.createdByUserId);
  const userParticipant = referral.participants.find((p) => p.userId === userId);
  const isCreator = referral.createdByUserId === userId;

  return {
    id: referral.id,
    title: referral.title,
    description: referral.description,
    category: referral.category,
    status: referral.status as ReferralStatus,
    visibility: referral.visibility as ReferralVisibility,
    locationText: referral.locationText,
    valueEstimate: referral.valueEstimate,
    currency: referral.currency,
    metadata: referral.metadata,
    createdByUserId: referral.createdByUserId,
    createdByName: creatorProfile?.fullName ?? null,
    createdByEmail: creatorProfile?.email ?? null,
    createdAt: referral.createdAt,
    updatedAt: referral.updatedAt,
    participants: referral.participants.map((p) => {
      const profile = profileMap.get(p.userId);
      return {
        userId: p.userId,
        userName: profile?.fullName ?? null,
        userEmail: profile?.email ?? null,
        role: p.role as ParticipantRole,
        joinedAt: p.joinedAt,
      };
    }),
    claims: referral.claims.map((c) => {
      const profile = profileMap.get(c.claimantUserId);
      return {
        id: c.id,
        claimantUserId: c.claimantUserId,
        claimantName: profile?.fullName ?? null,
        claimantEmail: profile?.email ?? null,
        message: c.message,
        status: c.status as ClaimStatus,
        createdAt: c.createdAt,
        resolvedAt: c.resolvedAt,
      };
    }),
    isCreator,
    isParticipant: isCreator || !!userParticipant,
    userRole: userParticipant?.role as ParticipantRole ?? (isCreator ? "creator" : null),
  };
}

/**
 * Get messages for a referral
 * Filters by visibility based on user's participant status
 */
export async function getReferralMessages(
  referralId: string
): Promise<ReferralMessageInfo[]> {
  const userId = await requireUserId();

  // First check if user can access this referral and if they're a participant
  const referral = await prisma.referral.findFirst({
    where: {
      id: referralId,
      OR: [
        { visibility: "public" },
        { createdByUserId: userId },
        { participants: { some: { userId } } },
      ],
    },
    include: {
      participants: {
        where: { userId },
        select: { role: true },
      },
    },
  });

  if (!referral) {
    throw new Error("Referral not found or access denied");
  }

  const isParticipant = referral.createdByUserId === userId || referral.participants.length > 0;

  // Build visibility filter
  const visibilityFilter: Prisma.ReferralMessageWhereInput = isParticipant
    ? {} // Participants can see all messages
    : { visibility: "public" }; // Non-participants only see public messages

  const messages = await prisma.referralMessage.findMany({
    where: {
      referralId,
      ...visibilityFilter,
    },
    orderBy: { createdAt: "asc" },
  });

  // Get user profiles
  const userIds = [...new Set(messages.map((m) => m.createdByUserId))];
  const profiles = await prisma.profile.findMany({
    where: { id: { in: userIds } },
    select: { id: true, fullName: true, email: true },
  });
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  return messages.map((m) => {
    const profile = profileMap.get(m.createdByUserId);
    return {
      id: m.id,
      createdByUserId: m.createdByUserId,
      createdByName: profile?.fullName ?? null,
      createdByEmail: profile?.email ?? null,
      messageType: m.messageType as MessageType,
      bodyText: m.bodyText,
      bodyHtml: m.bodyHtml,
      visibility: m.visibility as MessageVisibility,
      metadata: m.metadata,
      createdAt: m.createdAt,
    };
  });
}

/**
 * Get available categories for referrals
 */
export async function getReferralCategories(): Promise<string[]> {
  const result = await prisma.referral.findMany({
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  return result.map((r) => r.category);
}

// ============================================================================
// REFERRAL MUTATIONS
// ============================================================================

/**
 * Create a new referral
 * Creator is automatically added as a participant with 'creator' role
 */
export async function createReferral(input: CreateReferralInput): Promise<{ id: string }> {
  const userId = await requireUserId();

  const referral = await prisma.referral.create({
    data: {
      createdByUserId: userId,
      title: input.title,
      description: input.description,
      category: input.category,
      visibility: input.visibility ?? "public",
      locationText: input.locationText,
      valueEstimate: input.valueEstimate,
      currency: input.currency ?? "USD",
      metadata: input.metadata ?? {},
      participants: {
        create: {
          userId,
          role: "creator",
        },
      },
    },
  });

  return { id: referral.id };
}

/**
 * Update a referral (creator only)
 */
export async function updateReferral(
  referralId: string,
  input: Partial<CreateReferralInput>
): Promise<void> {
  const userId = await requireUserId();

  const referral = await prisma.referral.findFirst({
    where: {
      id: referralId,
      createdByUserId: userId,
    },
  });

  if (!referral) {
    throw new Error("Referral not found or access denied");
  }

  await prisma.referral.update({
    where: { id: referralId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.visibility !== undefined && { visibility: input.visibility }),
      ...(input.locationText !== undefined && { locationText: input.locationText }),
      ...(input.valueEstimate !== undefined && { valueEstimate: input.valueEstimate }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.metadata !== undefined && { metadata: input.metadata }),
    },
  });
}

/**
 * Close a referral (creator only)
 * Closed referrals are read-only
 */
export async function closeReferral(referralId: string): Promise<void> {
  const userId = await requireUserId();

  const referral = await prisma.referral.findFirst({
    where: {
      id: referralId,
      createdByUserId: userId,
    },
  });

  if (!referral) {
    throw new Error("Referral not found or access denied");
  }

  await prisma.$transaction([
    prisma.referral.update({
      where: { id: referralId },
      data: { status: "closed" },
    }),
    prisma.referralMessage.create({
      data: {
        referralId,
        createdByUserId: userId,
        messageType: "system",
        bodyText: "Referral closed",
        visibility: "public",
        metadata: { action: "closed" },
      },
    }),
  ]);
}

// ============================================================================
// CLAIM OPERATIONS
// ============================================================================

/**
 * Claim a referral
 * Creates a claim request and starts a private conversation thread
 */
export async function claimReferral(
  referralId: string,
  message?: string
): Promise<{ claimId: string }> {
  const userId = await requireUserId();

  const referral = await prisma.referral.findFirst({
    where: {
      id: referralId,
      status: "open",
      OR: [
        { visibility: "public" },
        { participants: { some: { userId } } },
      ],
    },
  });

  if (!referral) {
    throw new Error("Referral not found, not open, or access denied");
  }

  if (referral.createdByUserId === userId) {
    throw new Error("Cannot claim your own referral");
  }

  // Check if user already has a pending claim
  const existingClaim = await prisma.referralClaim.findFirst({
    where: {
      referralId,
      claimantUserId: userId,
      status: "requested",
    },
  });

  if (existingClaim) {
    throw new Error("You already have a pending claim on this referral");
  }

  const result = await prisma.$transaction(async (tx) => {
    // Create the claim
    const claim = await tx.referralClaim.create({
      data: {
        referralId,
        claimantUserId: userId,
        message,
        status: "requested",
      },
    });

    // Update referral status to claimed
    await tx.referral.update({
      where: { id: referralId },
      data: { status: "claimed" },
    });

    // Add claimant as observer (will upgrade to claimant on acceptance)
    await tx.referralParticipant.upsert({
      where: {
        referralId_userId: { referralId, userId },
      },
      create: {
        referralId,
        userId,
        role: "observer",
      },
      update: {},
    });

    // Create system message
    await tx.referralMessage.create({
      data: {
        referralId,
        createdByUserId: userId,
        messageType: "system",
        bodyText: "Claim requested",
        visibility: "participants_only",
        metadata: { action: "claim_requested", claimId: claim.id },
      },
    });

    // If claim has a message, create it as a private message
    if (message) {
      await tx.referralMessage.create({
        data: {
          referralId,
          createdByUserId: userId,
          messageType: "private",
          bodyText: message,
          visibility: "participants_only",
        },
      });
    }

    return claim;
  });

  return { claimId: result.id };
}

/**
 * Accept a claim (creator only)
 * Claimant becomes a full participant
 */
export async function acceptClaim(
  referralId: string,
  claimId: string
): Promise<void> {
  const userId = await requireUserId();

  const referral = await prisma.referral.findFirst({
    where: {
      id: referralId,
      createdByUserId: userId,
    },
    include: {
      claims: {
        where: { id: claimId },
      },
    },
  });

  if (!referral) {
    throw new Error("Referral not found or access denied");
  }

  const claim = referral.claims[0];
  if (!claim) {
    throw new Error("Claim not found");
  }

  if (claim.status !== "requested") {
    throw new Error("Claim is not in requested status");
  }

  await prisma.$transaction([
    // Update claim status
    prisma.referralClaim.update({
      where: { id: claimId },
      data: {
        status: "accepted",
        resolvedAt: new Date(),
      },
    }),
    // Update participant role to claimant
    prisma.referralParticipant.update({
      where: {
        referralId_userId: { referralId, userId: claim.claimantUserId },
      },
      data: { role: "claimant" },
    }),
    // Update referral status to assigned
    prisma.referral.update({
      where: { id: referralId },
      data: { status: "assigned" },
    }),
    // Reject all other pending claims
    prisma.referralClaim.updateMany({
      where: {
        referralId,
        id: { not: claimId },
        status: "requested",
      },
      data: {
        status: "rejected",
        resolvedAt: new Date(),
      },
    }),
    // Create system message
    prisma.referralMessage.create({
      data: {
        referralId,
        createdByUserId: userId,
        messageType: "system",
        bodyText: "Claim accepted",
        visibility: "participants_only",
        metadata: { action: "claim_accepted", claimId },
      },
    }),
  ]);
}

/**
 * Reject a claim (creator only)
 */
export async function rejectClaim(
  referralId: string,
  claimId: string
): Promise<void> {
  const userId = await requireUserId();

  const referral = await prisma.referral.findFirst({
    where: {
      id: referralId,
      createdByUserId: userId,
    },
    include: {
      claims: {
        where: { id: claimId },
      },
    },
  });

  if (!referral) {
    throw new Error("Referral not found or access denied");
  }

  const claim = referral.claims[0];
  if (!claim) {
    throw new Error("Claim not found");
  }

  if (claim.status !== "requested") {
    throw new Error("Claim is not in requested status");
  }

  await prisma.$transaction(async (tx) => {
    // Update claim status
    await tx.referralClaim.update({
      where: { id: claimId },
      data: {
        status: "rejected",
        resolvedAt: new Date(),
      },
    });

    // Check if there are other pending claims
    const pendingClaims = await tx.referralClaim.count({
      where: {
        referralId,
        status: "requested",
      },
    });

    // If no more pending claims, revert status to open
    if (pendingClaims === 0) {
      await tx.referral.update({
        where: { id: referralId },
        data: { status: "open" },
      });
    }

    // Create system message
    await tx.referralMessage.create({
      data: {
        referralId,
        createdByUserId: userId,
        messageType: "system",
        bodyText: "Claim rejected",
        visibility: "participants_only",
        metadata: { action: "claim_rejected", claimId },
      },
    });
  });
}

// ============================================================================
// MESSAGE OPERATIONS
// ============================================================================

/**
 * Create a message in a referral conversation
 */
export async function createReferralMessage(input: CreateMessageInput): Promise<{ id: string }> {
  const userId = await requireUserId();

  const referral = await prisma.referral.findFirst({
    where: {
      id: input.referralId,
      OR: [
        { visibility: "public" },
        { createdByUserId: userId },
        { participants: { some: { userId } } },
      ],
    },
    include: {
      participants: {
        where: { userId },
        select: { role: true },
      },
    },
  });

  if (!referral) {
    throw new Error("Referral not found or access denied");
  }

  // Check referral status for commenting rules
  if (referral.status === "closed") {
    throw new Error("Cannot message on closed referrals");
  }

  const isCreator = referral.createdByUserId === userId;
  const isParticipant = isCreator || referral.participants.length > 0;

  // Determine message type and visibility
  let messageType = input.messageType ?? "comment";
  let visibility = input.visibility ?? "public";

  // Only participants can send private messages
  if (messageType === "private" && !isParticipant) {
    throw new Error("Only participants can send private messages");
  }

  // Non-participants can only post public comments
  if (!isParticipant) {
    messageType = "comment";
    visibility = "public";
  }

  const message = await prisma.referralMessage.create({
    data: {
      referralId: input.referralId,
      createdByUserId: userId,
      messageType,
      bodyText: input.bodyText,
      bodyHtml: input.bodyHtml,
      visibility,
      metadata: input.metadata ?? {},
    },
  });

  // Update referral timestamp
  await prisma.referral.update({
    where: { id: input.referralId },
    data: { updatedAt: new Date() },
  });

  return { id: message.id };
}

