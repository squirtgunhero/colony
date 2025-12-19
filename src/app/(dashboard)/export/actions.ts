"use server";

import { prisma } from "@/lib/prisma";

function escapeCSV(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return `$${value.toLocaleString()}`;
}

export interface ExportOptions {
  startDate?: string;
  endDate?: string;
}

export async function exportContactsCSV(options?: ExportOptions): Promise<string> {
  const where: Record<string, unknown> = {};
  
  if (options?.startDate || options?.endDate) {
    where.createdAt = {};
    if (options.startDate) {
      (where.createdAt as Record<string, Date>).gte = new Date(options.startDate);
    }
    if (options.endDate) {
      (where.createdAt as Record<string, Date>).lte = new Date(options.endDate + "T23:59:59");
    }
  }

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const headers = ["Name", "Email", "Phone", "Type", "Source", "Favorite", "Notes", "Created At", "Updated At"];
  const rows = contacts.map((contact) => [
    escapeCSV(contact.name),
    escapeCSV(contact.email),
    escapeCSV(contact.phone),
    escapeCSV(contact.type),
    escapeCSV(contact.source),
    contact.isFavorite ? "Yes" : "No",
    escapeCSV(contact.notes),
    formatDate(contact.createdAt),
    formatDate(contact.updatedAt),
  ]);

  const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  return csv;
}

export async function exportPropertiesCSV(options?: ExportOptions): Promise<string> {
  const where: Record<string, unknown> = {};
  
  if (options?.startDate || options?.endDate) {
    where.createdAt = {};
    if (options.startDate) {
      (where.createdAt as Record<string, Date>).gte = new Date(options.startDate);
    }
    if (options.endDate) {
      (where.createdAt as Record<string, Date>).lte = new Date(options.endDate + "T23:59:59");
    }
  }

  const properties = await prisma.property.findMany({
    where,
    include: {
      owner: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "Address",
    "City",
    "State",
    "Zip Code",
    "Price",
    "Status",
    "Bedrooms",
    "Bathrooms",
    "Square Feet",
    "Owner",
    "Favorite",
    "Description",
    "Created At",
    "Updated At",
  ];

  const rows = properties.map((property) => [
    escapeCSV(property.address),
    escapeCSV(property.city),
    escapeCSV(property.state),
    escapeCSV(property.zipCode),
    formatCurrency(property.price),
    escapeCSV(property.status),
    escapeCSV(property.bedrooms),
    escapeCSV(property.bathrooms),
    escapeCSV(property.sqft),
    escapeCSV(property.owner?.name),
    property.isFavorite ? "Yes" : "No",
    escapeCSV(property.description),
    formatDate(property.createdAt),
    formatDate(property.updatedAt),
  ]);

  const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  return csv;
}

export async function exportDealsCSV(options?: ExportOptions): Promise<string> {
  const where: Record<string, unknown> = {};
  
  if (options?.startDate || options?.endDate) {
    where.createdAt = {};
    if (options.startDate) {
      (where.createdAt as Record<string, Date>).gte = new Date(options.startDate);
    }
    if (options.endDate) {
      (where.createdAt as Record<string, Date>).lte = new Date(options.endDate + "T23:59:59");
    }
  }

  const deals = await prisma.deal.findMany({
    where,
    include: {
      contact: true,
      property: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "Title",
    "Stage",
    "Value",
    "Contact",
    "Property",
    "Favorite",
    "Notes",
    "Created At",
    "Updated At",
  ];

  const rows = deals.map((deal) => [
    escapeCSV(deal.title),
    escapeCSV(deal.stage),
    formatCurrency(deal.value),
    escapeCSV(deal.contact?.name),
    escapeCSV(deal.property?.address),
    deal.isFavorite ? "Yes" : "No",
    escapeCSV(deal.notes),
    formatDate(deal.createdAt),
    formatDate(deal.updatedAt),
  ]);

  const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  return csv;
}

export async function exportTasksCSV(options?: ExportOptions): Promise<string> {
  const where: Record<string, unknown> = {};
  
  if (options?.startDate || options?.endDate) {
    where.createdAt = {};
    if (options.startDate) {
      (where.createdAt as Record<string, Date>).gte = new Date(options.startDate);
    }
    if (options.endDate) {
      (where.createdAt as Record<string, Date>).lte = new Date(options.endDate + "T23:59:59");
    }
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      contact: true,
      property: true,
      deal: true,
    },
    orderBy: { dueDate: "asc" },
  });

  const headers = [
    "Title",
    "Description",
    "Priority",
    "Due Date",
    "Completed",
    "Contact",
    "Property",
    "Deal",
    "Created At",
    "Updated At",
  ];

  const rows = tasks.map((task) => [
    escapeCSV(task.title),
    escapeCSV(task.description),
    escapeCSV(task.priority),
    formatDate(task.dueDate),
    task.completed ? "Yes" : "No",
    escapeCSV(task.contact?.name),
    escapeCSV(task.property?.address),
    escapeCSV(task.deal?.title),
    formatDate(task.createdAt),
    formatDate(task.updatedAt),
  ]);

  const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  return csv;
}

export async function exportActivitiesCSV(options?: ExportOptions): Promise<string> {
  const where: Record<string, unknown> = {};
  
  if (options?.startDate || options?.endDate) {
    where.createdAt = {};
    if (options.startDate) {
      (where.createdAt as Record<string, Date>).gte = new Date(options.startDate);
    }
    if (options.endDate) {
      (where.createdAt as Record<string, Date>).lte = new Date(options.endDate + "T23:59:59");
    }
  }

  const activities = await prisma.activity.findMany({
    where,
    include: {
      contact: true,
      property: true,
      deal: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "Type",
    "Title",
    "Description",
    "Contact",
    "Property",
    "Deal",
    "Created At",
  ];

  const rows = activities.map((activity) => [
    escapeCSV(activity.type),
    escapeCSV(activity.title),
    escapeCSV(activity.description),
    escapeCSV(activity.contact?.name),
    escapeCSV(activity.property?.address),
    escapeCSV(activity.deal?.title),
    formatDate(activity.createdAt),
  ]);

  const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  return csv;
}

export interface ExportStats {
  contacts: number;
  properties: number;
  deals: number;
  tasks: number;
  activities: number;
}

export async function getExportStats(): Promise<ExportStats> {
  const [contacts, properties, deals, tasks, activities] = await Promise.all([
    prisma.contact.count(),
    prisma.property.count(),
    prisma.deal.count(),
    prisma.task.count(),
    prisma.activity.count(),
  ]);

  return { contacts, properties, deals, tasks, activities };
}
