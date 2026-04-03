/**
 * Honeycomb data access layer
 * User-scoped operations for campaigns, creatives, and audience segments
 */

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import type { Prisma } from "@prisma/client";

// ============================================================================
// TYPES
// ============================================================================

export type CampaignStatus = "draft" | "active" | "paused" | "completed" | "archived";
export type CampaignObjective = "awareness" | "traffic" | "engagement" | "leads" | "sales";
export type CreativeType = "image" | "video" | "carousel" | "html";
export type CreativeStatus = "draft" | "approved" | "rejected" | "archived";
export type SegmentType = "saved" | "custom" | "lookalike";

export interface CampaignListItem {
  id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  objective: CampaignObjective | null;
  channel: AdChannel;
  budget: number | null;
  dailyBudget: number | null;
  startDate: Date | null;
  endDate: Date | null;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  createdAt: Date;
  updatedAt: Date;
  creativeCount: number;
  segmentCount: number;
}

export interface CampaignDetail extends CampaignListItem {
  creatives: CreativeListItem[];
  segments: SegmentListItem[];
}

export interface CreativeListItem {
  id: string;
  name: string;
  description: string | null;
  type: CreativeType;
  format: string | null;
  status: CreativeStatus;
  fileUrl: string | null;
  thumbnailUrl: string | null;
  fileSize: number | null;
  headline: string | null;
  bodyText: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  campaignCount: number;
}

export interface SegmentListItem {
  id: string;
  name: string;
  description: string | null;
  type: SegmentType;
  size: number | null;
  criteria: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  campaignCount: number;
}

// ============================================================================
// CREATE INPUT TYPES
// ============================================================================

export type AdChannel = "meta" | "native" | "llm" | "google" | "bing" | "local";

export interface CreateCampaignInput {
  name: string;
  description?: string;
  objective?: CampaignObjective;
  budget?: number;
  dailyBudget?: number;
  startDate?: Date;
  endDate?: Date;
  channel?: AdChannel;
  status?: CampaignStatus;
}

export interface CreateCreativeInput {
  name: string;
  description?: string;
  type?: CreativeType;
  format?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  fileSize?: number;
  headline?: string;
  bodyText?: string;
  ctaText?: string;
  ctaUrl?: string;
}

export interface CreateSegmentInput {
  name: string;
  description?: string;
  type?: SegmentType;
  criteria?: Record<string, unknown>;
}

// ============================================================================
// CAMPAIGNS
// ============================================================================

/**
 * Get all campaigns for the current user
 */
export async function getCampaigns(): Promise<CampaignListItem[]> {
  const userId = await requireUserId();

  const campaigns = await prisma.honeycombCampaign.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          creatives: true,
          segments: true,
        },
      },
    },
  });

  return campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    status: c.status as CampaignStatus,
    objective: c.objective as CampaignObjective | null,
    channel: (c.channel || "native") as AdChannel,
    budget: c.budget,
    dailyBudget: c.dailyBudget,
    startDate: c.startDate,
    endDate: c.endDate,
    impressions: c.impressions,
    clicks: c.clicks,
    conversions: c.conversions,
    spend: c.spend,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    creativeCount: c._count.creatives,
    segmentCount: c._count.segments,
  }));
}

/**
 * Get a single campaign by ID (must belong to current user)
 */
export async function getCampaignById(id: string): Promise<CampaignDetail | null> {
  const userId = await requireUserId();

  const campaign = await prisma.honeycombCampaign.findFirst({
    where: { id, userId },
    include: {
      creatives: {
        include: {
          creative: {
            include: {
              _count: { select: { campaigns: true } },
            },
          },
        },
      },
      segments: {
        include: {
          segment: {
            include: {
              _count: { select: { campaigns: true } },
            },
          },
        },
      },
      _count: {
        select: {
          creatives: true,
          segments: true,
        },
      },
    },
  });

  if (!campaign) return null;

  return {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    status: campaign.status as CampaignStatus,
    objective: campaign.objective as CampaignObjective | null,
    channel: (campaign.channel || "native") as AdChannel,
    budget: campaign.budget,
    dailyBudget: campaign.dailyBudget,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    impressions: campaign.impressions,
    clicks: campaign.clicks,
    conversions: campaign.conversions,
    spend: campaign.spend,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
    creativeCount: campaign._count.creatives,
    segmentCount: campaign._count.segments,
    creatives: campaign.creatives.map((cc) => ({
      id: cc.creative.id,
      name: cc.creative.name,
      description: cc.creative.description,
      type: cc.creative.type as CreativeType,
      format: cc.creative.format,
      status: cc.creative.status as CreativeStatus,
      fileUrl: cc.creative.fileUrl,
      thumbnailUrl: cc.creative.thumbnailUrl,
      fileSize: cc.creative.fileSize,
      headline: cc.creative.headline,
      bodyText: cc.creative.bodyText,
      ctaText: cc.creative.ctaText,
      ctaUrl: cc.creative.ctaUrl,
      createdAt: cc.creative.createdAt,
      updatedAt: cc.creative.updatedAt,
      campaignCount: cc.creative._count.campaigns,
    })),
    segments: campaign.segments.map((cs) => ({
      id: cs.segment.id,
      name: cs.segment.name,
      description: cs.segment.description,
      type: cs.segment.type as SegmentType,
      size: cs.segment.size,
      criteria: cs.segment.criteria as Record<string, unknown>,
      createdAt: cs.segment.createdAt,
      updatedAt: cs.segment.updatedAt,
      campaignCount: cs.segment._count.campaigns,
    })),
  };
}

/**
 * Create a new campaign for the current user
 */
export async function createCampaign(input: CreateCampaignInput): Promise<CampaignListItem> {
  const userId = await requireUserId();

  const campaign = await prisma.honeycombCampaign.create({
    data: {
      userId,
      name: input.name,
      description: input.description,
      objective: input.objective,
      channel: input.channel || "native",
      budget: input.budget,
      dailyBudget: input.dailyBudget,
      startDate: input.startDate,
      endDate: input.endDate,
      status: input.status || "draft",
    },
    include: {
      _count: {
        select: {
          creatives: true,
          segments: true,
        },
      },
    },
  });

  return {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    status: campaign.status as CampaignStatus,
    objective: campaign.objective as CampaignObjective | null,
    channel: (campaign.channel || "native") as AdChannel,
    budget: campaign.budget,
    dailyBudget: campaign.dailyBudget,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    impressions: campaign.impressions,
    clicks: campaign.clicks,
    conversions: campaign.conversions,
    spend: campaign.spend,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
    creativeCount: campaign._count.creatives,
    segmentCount: campaign._count.segments,
  };
}

/**
 * Update campaign status (must belong to current user)
 */
export async function updateCampaignStatus(
  id: string,
  status: CampaignStatus
): Promise<CampaignListItem | null> {
  const userId = await requireUserId();

  // Verify ownership
  const existing = await prisma.honeycombCampaign.findFirst({
    where: { id, userId },
  });

  if (!existing) return null;

  const campaign = await prisma.honeycombCampaign.update({
    where: { id },
    data: { status },
    include: {
      _count: {
        select: {
          creatives: true,
          segments: true,
        },
      },
    },
  });

  return {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    status: campaign.status as CampaignStatus,
    objective: campaign.objective as CampaignObjective | null,
    channel: (campaign.channel || "native") as AdChannel,
    budget: campaign.budget,
    dailyBudget: campaign.dailyBudget,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    impressions: campaign.impressions,
    clicks: campaign.clicks,
    conversions: campaign.conversions,
    spend: campaign.spend,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
    creativeCount: campaign._count.creatives,
    segmentCount: campaign._count.segments,
  };
}

// ============================================================================
// CREATIVES
// ============================================================================

/**
 * Get all creatives for the current user
 */
export async function getCreatives(): Promise<CreativeListItem[]> {
  const userId = await requireUserId();

  const creatives = await prisma.honeycombCreative.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          campaigns: true,
        },
      },
    },
  });

  return creatives.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    type: c.type as CreativeType,
    format: c.format,
    status: c.status as CreativeStatus,
    fileUrl: c.fileUrl,
    thumbnailUrl: c.thumbnailUrl,
    fileSize: c.fileSize,
    headline: c.headline,
    bodyText: c.bodyText,
    ctaText: c.ctaText,
    ctaUrl: c.ctaUrl,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    campaignCount: c._count.campaigns,
  }));
}

/**
 * Create a new creative for the current user
 */
export async function createCreative(input: CreateCreativeInput): Promise<CreativeListItem> {
  const userId = await requireUserId();

  const creative = await prisma.honeycombCreative.create({
    data: {
      userId,
      name: input.name,
      description: input.description,
      type: input.type || "image",
      format: input.format,
      fileUrl: input.fileUrl,
      thumbnailUrl: input.thumbnailUrl,
      fileSize: input.fileSize,
      headline: input.headline,
      bodyText: input.bodyText,
      ctaText: input.ctaText,
      ctaUrl: input.ctaUrl,
      status: "draft",
    },
    include: {
      _count: {
        select: {
          campaigns: true,
        },
      },
    },
  });

  return {
    id: creative.id,
    name: creative.name,
    description: creative.description,
    type: creative.type as CreativeType,
    format: creative.format,
    status: creative.status as CreativeStatus,
    fileUrl: creative.fileUrl,
    thumbnailUrl: creative.thumbnailUrl,
    fileSize: creative.fileSize,
    headline: creative.headline,
    bodyText: creative.bodyText,
    ctaText: creative.ctaText,
    ctaUrl: creative.ctaUrl,
    createdAt: creative.createdAt,
    updatedAt: creative.updatedAt,
    campaignCount: creative._count.campaigns,
  };
}

/**
 * Update creative status (must belong to current user)
 */
export async function updateCreativeStatus(
  id: string,
  status: CreativeStatus
): Promise<CreativeListItem | null> {
  const userId = await requireUserId();

  // Verify ownership
  const existing = await prisma.honeycombCreative.findFirst({
    where: { id, userId },
  });

  if (!existing) return null;

  const creative = await prisma.honeycombCreative.update({
    where: { id },
    data: { status },
    include: {
      _count: {
        select: {
          campaigns: true,
        },
      },
    },
  });

  return {
    id: creative.id,
    name: creative.name,
    description: creative.description,
    type: creative.type as CreativeType,
    format: creative.format,
    status: creative.status as CreativeStatus,
    fileUrl: creative.fileUrl,
    thumbnailUrl: creative.thumbnailUrl,
    fileSize: creative.fileSize,
    headline: creative.headline,
    bodyText: creative.bodyText,
    ctaText: creative.ctaText,
    ctaUrl: creative.ctaUrl,
    createdAt: creative.createdAt,
    updatedAt: creative.updatedAt,
    campaignCount: creative._count.campaigns,
  };
}

// ============================================================================
// SEGMENTS
// ============================================================================

/**
 * Get all segments for the current user
 */
export async function getSegments(): Promise<SegmentListItem[]> {
  const userId = await requireUserId();

  const segments = await prisma.honeycombSegment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          campaigns: true,
        },
      },
    },
  });

  return segments.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    type: s.type as SegmentType,
    size: s.size,
    criteria: s.criteria as Record<string, unknown>,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    campaignCount: s._count.campaigns,
  }));
}

/**
 * Create a new segment for the current user
 */
export async function createSegment(input: CreateSegmentInput): Promise<SegmentListItem> {
  const userId = await requireUserId();

  const segment = await prisma.honeycombSegment.create({
    data: {
      userId,
      name: input.name,
      description: input.description,
      type: input.type || "custom",
      criteria: (input.criteria ?? undefined) as Prisma.InputJsonValue | undefined,
    },
    include: {
      _count: {
        select: {
          campaigns: true,
        },
      },
    },
  });

  return {
    id: segment.id,
    name: segment.name,
    description: segment.description,
    type: segment.type as SegmentType,
    size: segment.size,
    criteria: segment.criteria as Record<string, unknown>,
    createdAt: segment.createdAt,
    updatedAt: segment.updatedAt,
    campaignCount: segment._count.campaigns,
  };
}

/**
 * Delete a segment (must belong to current user and not be in use)
 */
export async function deleteSegment(id: string): Promise<boolean> {
  const userId = await requireUserId();

  // Verify ownership
  const existing = await prisma.honeycombSegment.findFirst({
    where: { id, userId },
    include: {
      _count: { select: { campaigns: true } },
    },
  });

  if (!existing) return false;

  // Check if segment is in use
  if (existing._count.campaigns > 0) {
    throw new Error("Cannot delete segment that is in use by campaigns");
  }

  await prisma.honeycombSegment.delete({
    where: { id },
  });

  return true;
}

// ============================================================================
// DASHBOARD AGGREGATES
// ============================================================================

/**
 * Get dashboard KPIs for the current user
 */
export async function getDashboardKpis() {
  const userId = await requireUserId();

  const [campaigns, activeCampaigns, creatives, segments] = await Promise.all([
    prisma.honeycombCampaign.count({ where: { userId } }),
    prisma.honeycombCampaign.findMany({
      where: { userId, status: "active" },
      select: { impressions: true, clicks: true, conversions: true, spend: true },
    }),
    prisma.honeycombCreative.count({ where: { userId } }),
    prisma.honeycombSegment.count({ where: { userId } }),
  ]);

  const totals = activeCampaigns.reduce(
    (acc, c) => ({
      impressions: acc.impressions + c.impressions,
      clicks: acc.clicks + c.clicks,
      conversions: acc.conversions + c.conversions,
      spend: acc.spend + c.spend,
    }),
    { impressions: 0, clicks: 0, conversions: 0, spend: 0 }
  );

  return {
    totalCampaigns: campaigns,
    activeCampaigns: activeCampaigns.length,
    totalCreatives: creatives,
    totalSegments: segments,
    impressions: totals.impressions,
    clicks: totals.clicks,
    conversions: totals.conversions,
    spend: totals.spend,
    ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
  };
}

// ============================================================================
// CHAT BOTS
// ============================================================================

export type ChatBotStatus = "draft" | "active" | "paused";

export interface ChatBotListItem {
  id: string;
  name: string;
  description: string | null;
  status: ChatBotStatus;
  conversationCount: number;
  welcomeMessage: string | null;
  embedToken: string;
  qualificationFlow: unknown;
  brandColor: string | null;
  position: string | null;
  avatarUrl: string | null;
  companyName: string | null;
  autoGreet: boolean;
  autoGreetDelay: number;
  collectLeadAfter: number;
  notifyOnLead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateChatBotInput {
  name: string;
  description?: string;
  welcomeMessage?: string;
  systemPrompt?: string;
  qualificationFlow?: unknown;
  brandColor?: string;
  position?: string;
  avatarUrl?: string;
  companyName?: string;
  autoGreet?: boolean;
  autoGreetDelay?: number;
  collectLeadAfter?: number;
  notifyOnLead?: boolean;
}

export interface UpdateChatBotInput extends Partial<CreateChatBotInput> {
  status?: ChatBotStatus;
}

function mapBotToListItem(bot: {
  id: string;
  name: string;
  description: string | null;
  status: string;
  conversationCount: number;
  welcomeMessage: string | null;
  embedToken: string | null;
  qualificationFlow: unknown;
  brandColor: string | null;
  position: string | null;
  avatarUrl: string | null;
  companyName: string | null;
  autoGreet: boolean;
  autoGreetDelay: number;
  collectLeadAfter: number;
  notifyOnLead: boolean;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
}): ChatBotListItem {
  return {
    id: bot.id,
    name: bot.name,
    description: bot.description,
    status: bot.status as ChatBotStatus,
    conversationCount: bot.conversationCount,
    welcomeMessage: bot.welcomeMessage,
    embedToken: bot.embedToken ?? "",
    qualificationFlow: bot.qualificationFlow,
    brandColor: bot.brandColor,
    position: bot.position,
    avatarUrl: bot.avatarUrl,
    companyName: bot.companyName,
    autoGreet: bot.autoGreet,
    autoGreetDelay: bot.autoGreetDelay,
    collectLeadAfter: bot.collectLeadAfter,
    notifyOnLead: bot.notifyOnLead,
    createdAt: bot.createdAt,
    updatedAt: bot.updatedAt,
  };
}

/**
 * Get all chat bots for the current user
 */
export async function getChatBots(): Promise<ChatBotListItem[]> {
  const userId = await requireUserId();

  const chatBots = await prisma.honeycombChatBot.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return chatBots.map(mapBotToListItem);
}

/**
 * Get a single chat bot by ID (user-scoped)
 */
export async function getChatBot(id: string): Promise<ChatBotListItem | null> {
  const userId = await requireUserId();

  const bot = await prisma.honeycombChatBot.findFirst({
    where: { id, userId },
  });

  return bot ? mapBotToListItem(bot) : null;
}

/**
 * Create a new chat bot
 */
export async function createChatBot(input: CreateChatBotInput): Promise<ChatBotListItem> {
  const userId = await requireUserId();

  const chatBot = await prisma.honeycombChatBot.create({
    data: {
      userId,
      name: input.name,
      description: input.description,
      welcomeMessage: input.welcomeMessage,
      systemPrompt: input.systemPrompt,
      qualificationFlow: input.qualificationFlow ?? [],
      brandColor: input.brandColor,
      position: input.position,
      avatarUrl: input.avatarUrl,
      companyName: input.companyName,
      autoGreet: input.autoGreet,
      autoGreetDelay: input.autoGreetDelay,
      collectLeadAfter: input.collectLeadAfter,
      notifyOnLead: input.notifyOnLead,
    },
  });

  return mapBotToListItem(chatBot);
}

/**
 * Update a chat bot
 */
export async function updateChatBot(id: string, input: UpdateChatBotInput): Promise<ChatBotListItem | null> {
  const userId = await requireUserId();

  const existing = await prisma.honeycombChatBot.findFirst({
    where: { id, userId },
  });

  if (!existing) return null;

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.welcomeMessage !== undefined) data.welcomeMessage = input.welcomeMessage;
  if (input.systemPrompt !== undefined) data.systemPrompt = input.systemPrompt;
  if (input.status !== undefined) data.status = input.status;
  if (input.qualificationFlow !== undefined) data.qualificationFlow = input.qualificationFlow;
  if (input.brandColor !== undefined) data.brandColor = input.brandColor;
  if (input.position !== undefined) data.position = input.position;
  if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl;
  if (input.companyName !== undefined) data.companyName = input.companyName;
  if (input.autoGreet !== undefined) data.autoGreet = input.autoGreet;
  if (input.autoGreetDelay !== undefined) data.autoGreetDelay = input.autoGreetDelay;
  if (input.collectLeadAfter !== undefined) data.collectLeadAfter = input.collectLeadAfter;
  if (input.notifyOnLead !== undefined) data.notifyOnLead = input.notifyOnLead;

  const chatBot = await prisma.honeycombChatBot.update({
    where: { id },
    data,
  });

  return mapBotToListItem(chatBot);
}

/**
 * Delete a chat bot
 */
export async function deleteChatBot(id: string): Promise<boolean> {
  const userId = await requireUserId();

  const existing = await prisma.honeycombChatBot.findFirst({
    where: { id, userId },
  });

  if (!existing) return false;

  await prisma.honeycombChatBot.delete({
    where: { id },
  });

  return true;
}

/**
 * Get a chat bot by embed token (public, no auth required)
 */
export async function getChatBotByEmbedToken(embedToken: string) {
  return prisma.honeycombChatBot.findUnique({
    where: { embedToken },
    select: {
      id: true,
      name: true,
      welcomeMessage: true,
      qualificationFlow: true,
      brandColor: true,
      position: true,
      avatarUrl: true,
      companyName: true,
      autoGreet: true,
      autoGreetDelay: true,
      collectLeadAfter: true,
      status: true,
      systemPrompt: true,
    },
  });
}

/**
 * Get conversations for a bot with pagination
 */
export async function getBotConversations(botId: string, opts?: { limit?: number; cursor?: string; status?: string }) {
  const userId = await requireUserId();

  // Verify bot ownership
  const bot = await prisma.honeycombChatBot.findFirst({
    where: { id: botId, userId },
  });
  if (!bot) return null;

  const limit = opts?.limit || 50;

  const conversations = await prisma.chatBotConversation.findMany({
    where: {
      botId,
      ...(opts?.status ? { status: opts.status } : {}),
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 5, // Last 5 messages preview
      },
      _count: { select: { messages: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(opts?.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });

  const hasMore = conversations.length > limit;
  const data = hasMore ? conversations.slice(0, limit) : conversations;

  return {
    data,
    hasMore,
    cursor: hasMore ? data[data.length - 1]?.id : undefined,
  };
}

// ============================================================================
// PUBLISHERS
// ============================================================================

export type PublisherType = "ad_network" | "direct" | "programmatic";
export type PublisherStatus = "connected" | "pending" | "disconnected";

export interface PublisherListItem {
  id: string;
  name: string;
  type: PublisherType;
  status: PublisherStatus;
  logoUrl: string | null;
  placements: number;
  impressions: number;
  revenue: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePublisherInput {
  name: string;
  type?: PublisherType;
  logoUrl?: string;
}

/**
 * Get all publishers for the current user
 */
export async function getPublishers(): Promise<PublisherListItem[]> {
  const userId = await requireUserId();

  const publishers = await prisma.honeycombPublisher.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return publishers.map((pub) => ({
    id: pub.id,
    name: pub.name,
    type: pub.type as PublisherType,
    status: pub.status as PublisherStatus,
    logoUrl: pub.logoUrl,
    placements: pub.placements,
    impressions: pub.impressions,
    revenue: pub.revenue,
    createdAt: pub.createdAt,
    updatedAt: pub.updatedAt,
  }));
}

/**
 * Create a new publisher
 */
export async function createPublisher(input: CreatePublisherInput): Promise<PublisherListItem> {
  const userId = await requireUserId();

  const publisher = await prisma.honeycombPublisher.create({
    data: {
      userId,
      name: input.name,
      type: input.type || "ad_network",
      logoUrl: input.logoUrl,
    },
  });

  return {
    id: publisher.id,
    name: publisher.name,
    type: publisher.type as PublisherType,
    status: publisher.status as PublisherStatus,
    logoUrl: publisher.logoUrl,
    placements: publisher.placements,
    impressions: publisher.impressions,
    revenue: publisher.revenue,
    createdAt: publisher.createdAt,
    updatedAt: publisher.updatedAt,
  };
}

/**
 * Delete a publisher
 */
export async function deletePublisher(id: string): Promise<boolean> {
  const userId = await requireUserId();

  const existing = await prisma.honeycombPublisher.findFirst({
    where: { id, userId },
  });

  if (!existing) return false;

  await prisma.honeycombPublisher.delete({
    where: { id },
  });

  return true;
}
