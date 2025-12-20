/**
 * User-scoped database operations
 * All queries automatically filter by the authenticated user's ID
 * RLS policies enforce data isolation at the database level
 */

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

// ============================================================================
// CONTACTS
// ============================================================================

export async function getUserContacts() {
  const userId = await requireUserId();
  return prisma.contact.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUserContact(id: string) {
  const userId = await requireUserId();
  return prisma.contact.findFirst({
    where: { id, userId },
  });
}

export async function createUserContact(data: {
  name: string;
  email?: string;
  phone?: string;
  type?: string;
  source?: string;
  notes?: string;
}) {
  const userId = await requireUserId();
  return prisma.contact.create({
    data: {
      ...data,
      userId,
    },
  });
}

export async function updateUserContact(
  id: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    type?: string;
    source?: string;
    notes?: string;
    isFavorite?: boolean;
  }
) {
  const userId = await requireUserId();
  return prisma.contact.updateMany({
    where: { id, userId },
    data,
  });
}

export async function deleteUserContact(id: string) {
  const userId = await requireUserId();
  return prisma.contact.deleteMany({
    where: { id, userId },
  });
}

// ============================================================================
// PROPERTIES
// ============================================================================

export async function getUserProperties() {
  const userId = await requireUserId();
  return prisma.property.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      owner: true,
    },
  });
}

export async function getUserProperty(id: string) {
  const userId = await requireUserId();
  return prisma.property.findFirst({
    where: { id, userId },
    include: {
      owner: true,
      deals: true,
    },
  });
}

export async function createUserProperty(data: {
  address: string;
  city: string;
  state?: string;
  zipCode?: string;
  price: number;
  status?: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  description?: string;
  imageUrl?: string;
  ownerId?: string;
}) {
  const userId = await requireUserId();
  return prisma.property.create({
    data: {
      ...data,
      userId,
    },
  });
}

export async function updateUserProperty(
  id: string,
  data: {
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    price?: number;
    status?: string;
    bedrooms?: number;
    bathrooms?: number;
    sqft?: number;
    description?: string;
    imageUrl?: string;
    isFavorite?: boolean;
    ownerId?: string;
  }
) {
  const userId = await requireUserId();
  return prisma.property.updateMany({
    where: { id, userId },
    data,
  });
}

export async function deleteUserProperty(id: string) {
  const userId = await requireUserId();
  return prisma.property.deleteMany({
    where: { id, userId },
  });
}

// ============================================================================
// DEALS
// ============================================================================

export async function getUserDeals() {
  const userId = await requireUserId();
  return prisma.deal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      contact: true,
      property: true,
    },
  });
}

export async function getUserDeal(id: string) {
  const userId = await requireUserId();
  return prisma.deal.findFirst({
    where: { id, userId },
    include: {
      contact: true,
      property: true,
      tasks: true,
      activities: true,
    },
  });
}

export async function createUserDeal(data: {
  title: string;
  stage?: string;
  value?: number;
  expectedCloseDate?: Date;
  notes?: string;
  contactId?: string;
  propertyId?: string;
}) {
  const userId = await requireUserId();
  return prisma.deal.create({
    data: {
      ...data,
      userId,
    },
  });
}

export async function updateUserDeal(
  id: string,
  data: {
    title?: string;
    stage?: string;
    value?: number;
    expectedCloseDate?: Date;
    notes?: string;
    isFavorite?: boolean;
    contactId?: string;
    propertyId?: string;
  }
) {
  const userId = await requireUserId();
  return prisma.deal.updateMany({
    where: { id, userId },
    data,
  });
}

export async function deleteUserDeal(id: string) {
  const userId = await requireUserId();
  return prisma.deal.deleteMany({
    where: { id, userId },
  });
}

// ============================================================================
// TASKS
// ============================================================================

export async function getUserTasks() {
  const userId = await requireUserId();
  return prisma.task.findMany({
    where: { userId },
    orderBy: [{ completed: "asc" }, { dueDate: "asc" }],
    include: {
      contact: true,
      property: true,
      deal: true,
    },
  });
}

export async function getUserTask(id: string) {
  const userId = await requireUserId();
  return prisma.task.findFirst({
    where: { id, userId },
    include: {
      contact: true,
      property: true,
      deal: true,
    },
  });
}

export async function createUserTask(data: {
  title: string;
  description?: string;
  dueDate?: Date;
  priority?: string;
  contactId?: string;
  propertyId?: string;
  dealId?: string;
}) {
  const userId = await requireUserId();
  return prisma.task.create({
    data: {
      ...data,
      userId,
    },
  });
}

export async function updateUserTask(
  id: string,
  data: {
    title?: string;
    description?: string;
    dueDate?: Date;
    priority?: string;
    completed?: boolean;
    contactId?: string;
    propertyId?: string;
    dealId?: string;
  }
) {
  const userId = await requireUserId();
  return prisma.task.updateMany({
    where: { id, userId },
    data,
  });
}

export async function deleteUserTask(id: string) {
  const userId = await requireUserId();
  return prisma.task.deleteMany({
    where: { id, userId },
  });
}

// ============================================================================
// ACTIVITIES
// ============================================================================

export async function getUserActivities(limit?: number) {
  const userId = await requireUserId();
  return prisma.activity.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      contact: true,
      property: true,
      deal: true,
    },
  });
}

export async function createUserActivity(data: {
  type: string;
  title: string;
  description?: string;
  metadata?: string;
  contactId?: string;
  propertyId?: string;
  dealId?: string;
}) {
  const userId = await requireUserId();
  return prisma.activity.create({
    data: {
      ...data,
      userId,
    },
  });
}

// ============================================================================
// DOCUMENTS
// ============================================================================

export async function getUserDocuments() {
  const userId = await requireUserId();
  return prisma.document.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      property: true,
      deal: true,
    },
  });
}

export async function createUserDocument(data: {
  name: string;
  type: string;
  url: string;
  size?: number;
  propertyId?: string;
  dealId?: string;
}) {
  const userId = await requireUserId();
  return prisma.document.create({
    data: {
      ...data,
      userId,
    },
  });
}

export async function deleteUserDocument(id: string) {
  const userId = await requireUserId();
  return prisma.document.deleteMany({
    where: { id, userId },
  });
}

// ============================================================================
// DASHBOARD STATS
// ============================================================================

export async function getUserDashboardStats() {
  const userId = await requireUserId();

  const [
    totalContacts,
    totalDeals,
    pendingTasks,
    pipelineValue,
    recentActivities,
  ] = await Promise.all([
    prisma.contact.count({ where: { userId } }),
    prisma.deal.count({ where: { userId } }),
    prisma.task.count({ where: { userId, completed: false } }),
    prisma.deal.aggregate({
      where: { userId },
      _sum: { value: true },
    }),
    prisma.activity.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        contact: true,
        deal: true,
      },
    }),
  ]);

  return {
    totalContacts,
    totalDeals,
    pendingTasks,
    pipelineValue: pipelineValue._sum.value || 0,
    recentActivities,
  };
}

