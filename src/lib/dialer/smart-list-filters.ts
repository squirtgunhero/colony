import type { Prisma } from "@prisma/client";

export interface SmartFilter {
  field: string;
  operator: string;
  value: string;
}

export function buildWhereClause(
  userId: string,
  filters: SmartFilter[]
): Prisma.ContactWhereInput {
  const where: Prisma.ContactWhereInput = {
    userId,
    phone: { not: null },
  };

  const conditions: Prisma.ContactWhereInput[] = [];

  for (const filter of filters) {
    const condition = buildCondition(filter);
    if (condition) conditions.push(condition);
  }

  if (conditions.length > 0) {
    where.AND = conditions;
  }

  return where;
}

function buildCondition(filter: SmartFilter): Prisma.ContactWhereInput | null {
  const { field, operator, value } = filter;

  switch (field) {
    case "type":
      return operator === "equals"
        ? { type: value }
        : { type: { not: value } };

    case "source":
      return operator === "equals"
        ? { source: value }
        : { source: { not: value } };

    case "tags":
      return operator === "contains"
        ? { tags: { has: value } }
        : { tags: { isEmpty: true } };

    case "leadScore": {
      const num = parseInt(value, 10);
      if (isNaN(num)) return null;
      switch (operator) {
        case "gte": return { leadScore: { gte: num } };
        case "lte": return { leadScore: { lte: num } };
        case "equals": return { leadScore: num };
        default: return null;
      }
    }

    case "lastContactedAt": {
      const days = parseInt(value, 10);
      if (isNaN(days)) return null;
      const date = new Date();
      date.setDate(date.getDate() - days);
      switch (operator) {
        case "older_than": return { OR: [{ lastContactedAt: { lt: date } }, { lastContactedAt: null }] };
        case "within": return { lastContactedAt: { gte: date } };
        default: return null;
      }
    }

    case "createdAt": {
      const days = parseInt(value, 10);
      if (isNaN(days)) return null;
      const date = new Date();
      date.setDate(date.getDate() - days);
      switch (operator) {
        case "within": return { createdAt: { gte: date } };
        case "older_than": return { createdAt: { lt: date } };
        default: return null;
      }
    }

    default:
      return null;
  }
}
