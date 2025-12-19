"use server";

import { prisma } from "@/lib/prisma";

export interface SearchResult {
  id: string;
  type: "contact" | "property" | "deal" | "task";
  title: string;
  subtitle?: string;
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) {
    return [];
  }

  const searchTerm = query.toLowerCase();

  // Search in parallel
  const [contacts, properties, deals, tasks] = await Promise.all([
    // Search contacts
    prisma.contact.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm } },
          { email: { contains: searchTerm } },
          { phone: { contains: searchTerm } },
        ],
      },
      take: 5,
      select: { id: true, name: true, email: true, type: true },
    }),

    // Search properties
    prisma.property.findMany({
      where: {
        OR: [
          { address: { contains: searchTerm } },
          { city: { contains: searchTerm } },
        ],
      },
      take: 5,
      select: { id: true, address: true, city: true, price: true },
    }),

    // Search deals
    prisma.deal.findMany({
      where: {
        OR: [
          { title: { contains: searchTerm } },
          { notes: { contains: searchTerm } },
        ],
      },
      take: 5,
      select: { id: true, title: true, stage: true, value: true },
    }),

    // Search tasks
    prisma.task.findMany({
      where: {
        OR: [
          { title: { contains: searchTerm } },
          { description: { contains: searchTerm } },
        ],
      },
      take: 5,
      select: { id: true, title: true, completed: true, priority: true },
    }),
  ]);

  const results: SearchResult[] = [];

  // Map contacts
  contacts.forEach((contact) => {
    results.push({
      id: contact.id,
      type: "contact",
      title: contact.name,
      subtitle: contact.email || contact.type,
    });
  });

  // Map properties
  properties.forEach((property) => {
    results.push({
      id: property.id,
      type: "property",
      title: property.address,
      subtitle: `${property.city} • $${property.price.toLocaleString()}`,
    });
  });

  // Map deals
  deals.forEach((deal) => {
    results.push({
      id: deal.id,
      type: "deal",
      title: deal.title,
      subtitle: `${deal.stage.replace("_", " ")} • ${deal.value ? `$${deal.value.toLocaleString()}` : "No value"}`,
    });
  });

  // Map tasks
  tasks.forEach((task) => {
    results.push({
      id: task.id,
      type: "task",
      title: task.title,
      subtitle: `${task.priority} priority • ${task.completed ? "Completed" : "Pending"}`,
    });
  });

  return results;
}

