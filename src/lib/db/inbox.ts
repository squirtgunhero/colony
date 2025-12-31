/**
 * Inbox data access layer
 * User-scoped operations for inbox threads and messages
 */

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import type { Prisma } from "@prisma/client";

// ============================================================================
// TYPES
// ============================================================================

export type ThreadStatus = "open" | "archived" | "snoozed";
export type MessageChannel = "email" | "sms" | "call";
export type MessageDirection = "inbound" | "outbound";
export type MessageStatus = "sent" | "delivered" | "failed" | "missed" | "completed" | "voicemail";

export interface ThreadFilters {
  status?: ThreadStatus;
  assignedToMe?: boolean;
  teamId?: string;
  channel?: MessageChannel;
  unreadOnly?: boolean;
  search?: string;
}

export interface ThreadListItem {
  id: string;
  contactId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  unknownEmail: string | null;
  unknownPhone: string | null;
  unknownName: string | null;
  status: string;
  assignedUserId: string | null;
  lastMessageAt: Date;
  lastMessagePreview: string | null;
  lastMessageChannel: MessageChannel | null;
  isUnread: boolean;
  messageCount: number;
}

export interface ThreadDetail {
  id: string;
  contact: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  unknownEmail: string | null;
  unknownPhone: string | null;
  unknownName: string | null;
  status: string;
  assignedUserId: string | null;
  snoozedUntil: Date | null;
  createdAt: Date;
  messages: ThreadMessage[];
}

export interface ThreadMessage {
  id: string;
  channel: MessageChannel;
  direction: MessageDirection;
  status: string;
  occurredAt: Date;
  subject: string | null;
  fromAddress: string;
  toAddress: string;
  bodyText: string | null;
  bodyHtml: string | null;
  metadata: Prisma.JsonValue;
  createdByUserId: string | null;
}

// ============================================================================
// THREAD QUERIES
// ============================================================================

/**
 * Get threads for the current user's inbox
 * Supports filtering by status, assignment, channel, and unread state
 */
export async function getInboxThreads(
  filters: ThreadFilters = {},
  cursor?: string,
  limit = 50
): Promise<{ threads: ThreadListItem[]; nextCursor: string | null }> {
  const userId = await requireUserId();

  const where: Prisma.InboxThreadWhereInput = {
    // User can see threads assigned to them or to their teams
    OR: [
      { assignedUserId: userId },
      // For now, also show unassigned threads (future: team membership check)
      { assignedUserId: null },
    ],
  };

  // Status filter
  if (filters.status) {
    where.status = filters.status;
  } else {
    // Default: show open threads (exclude archived unless explicitly requested)
    where.status = "open";
  }

  // Assigned to me filter
  if (filters.assignedToMe) {
    where.assignedUserId = userId;
    // Remove the OR clause
    delete where.OR;
  }

  // Team filter
  if (filters.teamId) {
    where.teamId = filters.teamId;
  }

  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    where.OR = [
      { contact: { name: { contains: searchLower, mode: "insensitive" } } },
      { contact: { email: { contains: searchLower, mode: "insensitive" } } },
      { contact: { phone: { contains: searchLower, mode: "insensitive" } } },
      { unknownEmail: { contains: searchLower, mode: "insensitive" } },
      { unknownPhone: { contains: searchLower, mode: "insensitive" } },
      { lastMessagePreview: { contains: searchLower, mode: "insensitive" } },
    ];
  }

  const threads = await prisma.inboxThread.findMany({
    where,
    take: limit + 1, // Fetch one extra to determine if there's a next page
    orderBy: { lastMessageAt: "desc" },
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      contact: {
        select: { id: true, name: true, email: true, phone: true },
      },
      messages: {
        orderBy: { occurredAt: "desc" },
        take: 1,
        select: { channel: true },
      },
      participants: {
        where: { userId },
        select: { lastReadAt: true },
      },
      _count: {
        select: { messages: true },
      },
    },
  });

  // Check if there's a next page
  const hasNextPage = threads.length > limit;
  const threadsToReturn = hasNextPage ? threads.slice(0, limit) : threads;

  // Map to ThreadListItem with unread calculation
  const threadList: ThreadListItem[] = threadsToReturn.map((t) => {
    const participant = t.participants[0];
    const lastReadAt = participant?.lastReadAt;
    const isUnread = !lastReadAt || t.lastMessageAt > lastReadAt;
    const lastMessage = t.messages[0];

    return {
      id: t.id,
      contactId: t.contactId,
      contactName: t.contact?.name ?? null,
      contactEmail: t.contact?.email ?? null,
      contactPhone: t.contact?.phone ?? null,
      unknownEmail: t.unknownEmail,
      unknownPhone: t.unknownPhone,
      unknownName: t.unknownName,
      status: t.status,
      assignedUserId: t.assignedUserId,
      lastMessageAt: t.lastMessageAt,
      lastMessagePreview: t.lastMessagePreview,
      lastMessageChannel: (lastMessage?.channel as MessageChannel) ?? null,
      isUnread,
      messageCount: t._count.messages,
    };
  });

  // Apply unread filter client-side (after pagination)
  const filteredThreads = filters.unreadOnly
    ? threadList.filter((t) => t.isUnread)
    : threadList;

  // Apply channel filter
  const channelFilteredThreads = filters.channel
    ? filteredThreads.filter((t) => t.lastMessageChannel === filters.channel)
    : filteredThreads;

  return {
    threads: channelFilteredThreads,
    nextCursor: hasNextPage ? threadsToReturn[threadsToReturn.length - 1].id : null,
  };
}

/**
 * Get a single thread with all messages
 */
export async function getThreadDetail(threadId: string): Promise<ThreadDetail | null> {
  const userId = await requireUserId();

  const thread = await prisma.inboxThread.findFirst({
    where: {
      id: threadId,
      OR: [
        { assignedUserId: userId },
        { assignedUserId: null },
      ],
    },
    include: {
      contact: {
        select: { id: true, name: true, email: true, phone: true },
      },
      messages: {
        orderBy: { occurredAt: "asc" },
      },
    },
  });

  if (!thread) return null;

  return {
    id: thread.id,
    contact: thread.contact,
    unknownEmail: thread.unknownEmail,
    unknownPhone: thread.unknownPhone,
    unknownName: thread.unknownName,
    status: thread.status,
    assignedUserId: thread.assignedUserId,
    snoozedUntil: thread.snoozedUntil,
    createdAt: thread.createdAt,
    messages: thread.messages.map((m) => ({
      id: m.id,
      channel: m.channel as MessageChannel,
      direction: m.direction as MessageDirection,
      status: m.status,
      occurredAt: m.occurredAt,
      subject: m.subject,
      fromAddress: m.fromAddress,
      toAddress: m.toAddress,
      bodyText: m.bodyText,
      bodyHtml: m.bodyHtml,
      metadata: m.metadata,
      createdByUserId: m.createdByUserId,
    })),
  };
}

/**
 * Get unread count for the current user
 */
export async function getUnreadCount(): Promise<number> {
  const userId = await requireUserId();

  // Get all open threads accessible to user
  const threads = await prisma.inboxThread.findMany({
    where: {
      status: "open",
      OR: [
        { assignedUserId: userId },
        { assignedUserId: null },
      ],
    },
    select: {
      id: true,
      lastMessageAt: true,
      participants: {
        where: { userId },
        select: { lastReadAt: true },
      },
    },
  });

  // Count unread
  return threads.filter((t) => {
    const participant = t.participants[0];
    const lastReadAt = participant?.lastReadAt;
    return !lastReadAt || t.lastMessageAt > lastReadAt;
  }).length;
}

// ============================================================================
// THREAD MUTATIONS
// ============================================================================

/**
 * Mark a thread as read for the current user
 */
export async function markThreadAsRead(threadId: string): Promise<void> {
  const userId = await requireUserId();

  await prisma.inboxParticipant.upsert({
    where: {
      threadId_userId: { threadId, userId },
    },
    create: {
      threadId,
      userId,
      lastReadAt: new Date(),
    },
    update: {
      lastReadAt: new Date(),
    },
  });
}

/**
 * Mark a thread as unread for the current user
 */
export async function markThreadAsUnread(threadId: string): Promise<void> {
  const userId = await requireUserId();

  await prisma.inboxParticipant.upsert({
    where: {
      threadId_userId: { threadId, userId },
    },
    create: {
      threadId,
      userId,
      lastReadAt: null,
    },
    update: {
      lastReadAt: null,
    },
  });
}

/**
 * Assign a thread to a user
 */
export async function assignThread(threadId: string, assigneeUserId: string | null): Promise<void> {
  const userId = await requireUserId();

  // Verify user can access this thread
  const thread = await prisma.inboxThread.findFirst({
    where: {
      id: threadId,
      OR: [
        { assignedUserId: userId },
        { assignedUserId: null },
      ],
    },
  });

  if (!thread) {
    throw new Error("Thread not found or access denied");
  }

  await prisma.inboxThread.update({
    where: { id: threadId },
    data: { assignedUserId: assigneeUserId },
  });
}

/**
 * Archive a thread
 */
export async function archiveThread(threadId: string): Promise<void> {
  const userId = await requireUserId();

  await prisma.inboxThread.updateMany({
    where: {
      id: threadId,
      OR: [
        { assignedUserId: userId },
        { assignedUserId: null },
      ],
    },
    data: {
      status: "archived",
      snoozedUntil: null,
    },
  });
}

/**
 * Unarchive a thread (set back to open)
 */
export async function unarchiveThread(threadId: string): Promise<void> {
  const userId = await requireUserId();

  await prisma.inboxThread.updateMany({
    where: {
      id: threadId,
      OR: [
        { assignedUserId: userId },
        { assignedUserId: null },
      ],
    },
    data: {
      status: "open",
    },
  });
}

/**
 * Snooze a thread until a specific date/time
 */
export async function snoozeThread(threadId: string, until: Date): Promise<void> {
  const userId = await requireUserId();

  await prisma.inboxThread.updateMany({
    where: {
      id: threadId,
      OR: [
        { assignedUserId: userId },
        { assignedUserId: null },
      ],
    },
    data: {
      status: "snoozed",
      snoozedUntil: until,
    },
  });
}

/**
 * Unsnooze a thread (called when snooze time is reached or manually)
 */
export async function unsnoozeThread(threadId: string): Promise<void> {
  await prisma.inboxThread.update({
    where: { id: threadId },
    data: {
      status: "open",
      snoozedUntil: null,
    },
  });
}

// ============================================================================
// MESSAGE OPERATIONS
// ============================================================================

/**
 * Create a new message in a thread
 * Used for outbound messages sent by users
 */
export async function createOutboundMessage(data: {
  threadId: string;
  channel: MessageChannel;
  toAddress: string;
  fromAddress: string;
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
  providerMessageId?: string;
  metadata?: Prisma.JsonValue;
}): Promise<{ id: string }> {
  const userId = await requireUserId();

  const message = await prisma.inboxMessage.create({
    data: {
      threadId: data.threadId,
      channel: data.channel,
      direction: "outbound",
      status: "sent",
      occurredAt: new Date(),
      fromAddress: data.fromAddress,
      toAddress: data.toAddress,
      subject: data.subject,
      bodyText: data.bodyText,
      bodyHtml: data.bodyHtml,
      providerMessageId: data.providerMessageId,
      metadata: data.metadata ?? {},
      createdByUserId: userId,
    },
  });

  // Update thread's last message
  await prisma.inboxThread.update({
    where: { id: data.threadId },
    data: {
      lastMessageAt: message.occurredAt,
      lastMessagePreview: data.bodyText?.substring(0, 200) ?? data.subject ?? null,
    },
  });

  // Mark as read since user just sent a message
  await markThreadAsRead(data.threadId);

  return { id: message.id };
}

/**
 * Create an inbound message (from webhook/provider event)
 * This reopens archived/snoozed threads
 */
export async function createInboundMessage(data: {
  threadId: string;
  channel: MessageChannel;
  fromAddress: string;
  toAddress: string;
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
  status?: MessageStatus;
  providerMessageId?: string;
  metadata?: Prisma.JsonValue;
  occurredAt?: Date;
}): Promise<{ id: string }> {
  const message = await prisma.inboxMessage.create({
    data: {
      threadId: data.threadId,
      channel: data.channel,
      direction: "inbound",
      status: data.status ?? "delivered",
      occurredAt: data.occurredAt ?? new Date(),
      fromAddress: data.fromAddress,
      toAddress: data.toAddress,
      subject: data.subject,
      bodyText: data.bodyText,
      bodyHtml: data.bodyHtml,
      providerMessageId: data.providerMessageId,
      metadata: data.metadata ?? {},
    },
  });

  // Update thread - reopen if archived/snoozed
  await prisma.inboxThread.update({
    where: { id: data.threadId },
    data: {
      status: "open",
      snoozedUntil: null,
      lastMessageAt: message.occurredAt,
      lastMessagePreview: data.bodyText?.substring(0, 200) ?? data.subject ?? null,
    },
  });

  return { id: message.id };
}

// ============================================================================
// THREAD MATCHING & CREATION
// ============================================================================

/**
 * Find or create a thread for a given address (email or phone)
 * Matches against contact records first, then existing threads
 */
export async function findOrCreateThread(data: {
  channel: MessageChannel;
  address: string; // Email address or E.164 phone number
  direction: MessageDirection;
  userId?: string; // For outbound messages, the sending user
}): Promise<{ threadId: string; isNew: boolean }> {
  const normalizedAddress = data.address.toLowerCase().trim();

  // Try to match a contact by email or phone
  let contact = null;
  if (data.channel === "email") {
    contact = await prisma.contact.findFirst({
      where: { email: { equals: normalizedAddress, mode: "insensitive" } },
      select: { id: true },
    });
  } else {
    // For SMS/calls, normalize phone number
    const normalizedPhone = normalizePhoneNumber(normalizedAddress);
    contact = await prisma.contact.findFirst({
      where: { phone: { contains: normalizedPhone } },
      select: { id: true },
    });
  }

  // Look for existing thread
  const existingThread = await prisma.inboxThread.findFirst({
    where: contact
      ? { contactId: contact.id }
      : data.channel === "email"
      ? { unknownEmail: normalizedAddress }
      : { unknownPhone: normalizePhoneNumber(normalizedAddress) },
    select: { id: true },
  });

  if (existingThread) {
    return { threadId: existingThread.id, isNew: false };
  }

  // Create new thread
  const newThread = await prisma.inboxThread.create({
    data: {
      contactId: contact?.id ?? null,
      assignedUserId: data.userId ?? null,
      status: "open",
      lastMessageAt: new Date(),
      ...(contact
        ? {}
        : data.channel === "email"
        ? { unknownEmail: normalizedAddress }
        : { unknownPhone: normalizePhoneNumber(normalizedAddress) }),
    },
  });

  // If user is creating this thread, add them as participant
  if (data.userId) {
    await prisma.inboxParticipant.create({
      data: {
        threadId: newThread.id,
        userId: data.userId,
        lastReadAt: new Date(),
      },
    });
  }

  return { threadId: newThread.id, isNew: true };
}

/**
 * Normalize a phone number to E.164 format (basic implementation)
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");
  
  // If it starts with 1 and has 11 digits, it's a US number
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  
  // If it has 10 digits, assume US and add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // Otherwise return as-is with + prefix if not present
  return digits.startsWith("+") ? digits : `+${digits}`;
}

// ============================================================================
// INTERNAL NOTE SUPPORT
// ============================================================================

/**
 * Add an internal note to a thread (stored as a special message type)
 */
export async function addInternalNote(threadId: string, noteText: string): Promise<{ id: string }> {
  const userId = await requireUserId();

  // Verify access
  const thread = await prisma.inboxThread.findFirst({
    where: {
      id: threadId,
      OR: [
        { assignedUserId: userId },
        { assignedUserId: null },
      ],
    },
  });

  if (!thread) {
    throw new Error("Thread not found or access denied");
  }

  // Store as a special "internal" channel message
  const message = await prisma.inboxMessage.create({
    data: {
      threadId,
      channel: "email", // Using email as base channel
      direction: "outbound", // Internal notes are from the user
      status: "completed",
      occurredAt: new Date(),
      fromAddress: "internal",
      toAddress: "internal",
      bodyText: noteText,
      metadata: { type: "internal_note" },
      createdByUserId: userId,
    },
  });

  return { id: message.id };
}

