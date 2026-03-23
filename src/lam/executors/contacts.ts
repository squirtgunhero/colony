// Contacts & Saved Search Domain Executors
import { prisma } from "@/lib/prisma";
import type { ActionExecutor } from "../types";
import { recordChange } from "../helpers";

// ---------------------------------------------------------------------------
// CSV parsing helpers (used by contacts.import)
// ---------------------------------------------------------------------------

interface ContactRow {
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  type?: string;
  tags?: string[];
  notes?: string;
}

/**
 * Parse a raw CSV string into ContactRow objects.
 * Handles quoted fields, CRLF, and common column name variants.
 */
function parseCSVRows(raw: string): ContactRow[] {
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]).map((h) => h.toLowerCase().trim());

  const colIndex = (variants: string[]): number =>
    variants.reduce((found, v) => (found !== -1 ? found : headers.indexOf(v)), -1);

  const nameCol  = colIndex(["name", "full name", "fullname", "contact name", "first name"]);
  const emailCol = colIndex(["email", "email address", "e-mail"]);
  const phoneCol = colIndex(["phone", "phone number", "mobile", "cell"]);
  const typeCol  = colIndex(["type", "contact type"]);
  const srcCol   = colIndex(["source", "lead source"]);
  const notesCol = colIndex(["notes", "note", "comments"]);
  const tagsCol  = colIndex(["tags", "tag", "labels"]);

  const rows: ContactRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCSVLine(lines[i]);
    const get = (idx: number) => (idx !== -1 ? (cells[idx] ?? "").trim() : "");

    const name = nameCol !== -1 ? get(nameCol) : "";
    if (!name) continue; // skip rows with no name

    const validTypes = ["lead", "client", "agent", "vendor"];
    const rawType = get(typeCol).toLowerCase();

    rows.push({
      name,
      email: get(emailCol) || undefined,
      phone: get(phoneCol) || undefined,
      source: get(srcCol) || undefined,
      type: validTypes.includes(rawType) ? rawType : "lead",
      tags: get(tagsCol) ? get(tagsCol).split(/[,;|]/).map((t) => t.trim()).filter(Boolean) : [],
      notes: get(notesCol) || undefined,
    });
  }
  return rows;
}

/** Minimal RFC-4180 CSV line splitter that handles quoted fields. */
function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      result.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

interface BulkUpsertResult {
  created: Array<{ id: string; name: string }>;
  updated: Array<{ id: string; name: string }>;
  skipped: number;
  errors: number;
}

/**
 * Bulk upsert ContactRows into the database.
 * Dedup strategy:
 *   skip   — if a contact with the same email exists, skip
 *   update — if a contact with the same email exists, merge fields
 *   create — always create (allows duplicates)
 */
async function bulkUpsertContacts(
  rows: ContactRow[],
  userId: string,
  strategy: "skip" | "update" | "create"
): Promise<BulkUpsertResult> {
  const result: BulkUpsertResult = { created: [], updated: [], skipped: 0, errors: 0 };

  for (const row of rows) {
    try {
      if (strategy !== "create" && row.email) {
        const existing = await prisma.contact.findFirst({
          where: { userId, email: row.email },
          select: { id: true, name: true },
        });

        if (existing) {
          if (strategy === "skip") {
            result.skipped++;
            continue;
          }
          // strategy === "update"
          await prisma.contact.update({
            where: { id: existing.id },
            data: {
              name: row.name,
              phone: row.phone ?? undefined,
              source: row.source ?? undefined,
              type: row.type ?? "lead",
              tags: row.tags ?? [],
              notes: row.notes ?? undefined,
            },
          });
          result.updated.push({ id: existing.id, name: row.name });
          continue;
        }
      }

      const created = await prisma.contact.create({
        data: {
          userId,
          name: row.name,
          email: row.email ?? null,
          phone: row.phone ?? null,
          source: row.source ?? null,
          type: row.type ?? "lead",
          tags: row.tags ?? [],
          notes: row.notes ?? null,
        },
        select: { id: true, name: true },
      });
      result.created.push(created);
    } catch {
      result.errors++;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Executor map
// ---------------------------------------------------------------------------

export const contactsExecutors: Record<string, ActionExecutor> = {
  "contacts.import": async (action, ctx) => {
    if (action.type !== "contacts.import") throw new Error("Invalid action type");

    const { source, raw_csv, dedup_strategy } = action.payload;

    // If raw CSV text was pasted directly into the chat, process it inline.
    if (source === "paste" && raw_csv) {
      try {
        const rows = parseCSVRows(raw_csv);
        if (rows.length === 0) {
          return {
            action_id: action.action_id,
            action_type: action.type,
            status: "failed" as const,
            error: "No rows found in the pasted CSV data.",
          };
        }

        const result = await bulkUpsertContacts(rows, ctx.user_id, dedup_strategy);

        // Log change entries so undo works
        await prisma.lamChangeLog.createMany({
          data: result.created.map((c) => ({
            runId: ctx.run_id,
            actionId: action.action_id,
            entityType: "Contact",
            entityId: c.id,
            operation: "create" as const,
            beforeJson: undefined,
            afterJson: JSON.parse(JSON.stringify(c)),
          })),
        });

        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "success" as const,
          data: {
            imported: result.created.length,
            updated: result.updated.length,
            skipped: result.skipped,
            errors: result.errors,
            // Sentinel for the chat UI to show the import summary card
            __import_complete: true,
          },
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "failed" as const,
          error: `CSV import failed: ${msg}`,
        };
      }
    }

    // For "csv" (file) and "hubspot" sources the UI handles collection and
    // sends rows to /api/import/csv directly. Return a sentinel so the
    // CommandBar / ChatDrawer knows to open the ImportPanel.
    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success" as const,
      data: {
        __open_import_panel: true,
        source,
        dedup_strategy,
      },
    };
  },

  "savedSearch.create": async (action, ctx) => {
    if (action.type !== "savedSearch.create") throw new Error("Invalid action type");
    const p = action.payload;

    // Resolve contactId from name if needed
    let contactId = p.contactId;
    if (!contactId && p.contactName) {
      const contact = await prisma.contact.findFirst({
        where: { userId: ctx.user_id, name: { contains: p.contactName, mode: "insensitive" } },
        select: { id: true },
      });
      contactId = contact?.id;
    }

    const search = await prisma.savedSearch.create({
      data: {
        userId:        ctx.user_id,
        contactId:     contactId ?? null,
        name:          p.name ?? null,
        priceMin:      p.priceMin ?? null,
        priceMax:      p.priceMax ?? null,
        bedsMin:       p.bedsMin ?? null,
        bathsMin:      p.bathsMin ?? null,
        propertyTypes: p.propertyTypes ?? [],
        neighborhoods: p.neighborhoods ?? [],
        cities:        p.cities ?? [],
        zipCodes:      p.zipCodes ?? [],
        mustHaves:     p.mustHaves ?? [],
        notes:         p.notes ?? null,
      },
    });

    await recordChange(ctx.run_id, action.action_id, "SavedSearch", search.id, "create", null, search);

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: search,
      entity_id: search.id,
      after_state: search,
    };
  },

  "savedSearch.update": async (action, ctx) => {
    if (action.type !== "savedSearch.update") throw new Error("Invalid action type");
    const p = action.payload;

    // Find the search: by id, or by contactName (most recent active)
    let search = p.id
      ? await prisma.savedSearch.findUnique({ where: { id: p.id } })
      : null;

    if (!search && p.contactName) {
      const contact = await prisma.contact.findFirst({
        where: { userId: ctx.user_id, name: { contains: p.contactName, mode: "insensitive" } },
        select: { id: true },
      });
      if (contact) {
        search = await prisma.savedSearch.findFirst({
          where: { userId: ctx.user_id, contactId: contact.id, isActive: true },
          orderBy: { createdAt: "desc" },
        });
      }
    }

    if (!search) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed",
        error: "Saved search not found. Use savedSearch.create to create one first.",
      };
    }

    const before = { ...search };
    const patch = p.patch;
    const updated = await prisma.savedSearch.update({
      where: { id: search.id },
      data: {
        ...(patch.name          !== undefined && { name: patch.name }),
        ...(patch.priceMin      !== undefined && { priceMin: patch.priceMin }),
        ...(patch.priceMax      !== undefined && { priceMax: patch.priceMax }),
        ...(patch.bedsMin       !== undefined && { bedsMin: patch.bedsMin }),
        ...(patch.bathsMin      !== undefined && { bathsMin: patch.bathsMin }),
        ...(patch.propertyTypes !== undefined && { propertyTypes: patch.propertyTypes }),
        ...(patch.neighborhoods !== undefined && { neighborhoods: patch.neighborhoods }),
        ...(patch.cities        !== undefined && { cities: patch.cities }),
        ...(patch.zipCodes      !== undefined && { zipCodes: patch.zipCodes }),
        ...(patch.mustHaves     !== undefined && { mustHaves: patch.mustHaves }),
        ...(patch.notes         !== undefined && { notes: patch.notes }),
        ...(patch.isActive      !== undefined && { isActive: patch.isActive }),
      },
    });

    await recordChange(ctx.run_id, action.action_id, "SavedSearch", updated.id, "update", before, updated);

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: updated,
      entity_id: updated.id,
      before_state: before,
      after_state: updated,
    };
  },

  "savedSearch.list": async (action, ctx) => {
    if (action.type !== "savedSearch.list") throw new Error("Invalid action type");
    const p = action.payload;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { userId: ctx.user_id };

    if (p.active !== undefined) where.isActive = p.active;
    if (p.contactId) {
      where.contactId = p.contactId;
    } else if (p.contactName) {
      const contact = await prisma.contact.findFirst({
        where: { userId: ctx.user_id, name: { contains: p.contactName, mode: "insensitive" } },
        select: { id: true },
      });
      if (contact) where.contactId = contact.id;
    }

    const searches = await prisma.savedSearch.findMany({
      where,
      include: { contact: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: { searches },
    };
  },
};
