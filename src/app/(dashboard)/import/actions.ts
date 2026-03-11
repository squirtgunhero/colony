"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";

// ── Types (re-exported so the page can import them without going through the API) ──

export type DedupStrategy = "skip" | "update" | "create";

export interface ContactRow {
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  type: "lead" | "client" | "agent" | "vendor";
  tags: string[];
  notes?: string;
  isDuplicate?: boolean;
  existingId?: string;
}

export interface PreviewResult {
  rows: ContactRow[];
  total: number;
  duplicates: number;
  headers: string[];
  columnMap: Record<string, string>;
}

export interface CommitResult {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  errorDetails?: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function buildColumnMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const lower = headers.map((h) => h.toLowerCase().trim());
  const variants: Record<string, string[]> = {
    name:   ["name", "full name", "fullname", "contact name", "first name", "firstname"],
    email:  ["email", "email address", "e-mail", "mail"],
    phone:  ["phone", "phone number", "mobile", "cell", "telephone"],
    type:   ["type", "contact type", "category"],
    source: ["source", "lead source", "origin", "channel"],
    notes:  ["notes", "note", "comments", "comment", "description"],
    tags:   ["tags", "tag", "labels", "label"],
  };
  for (const [field, aliases] of Object.entries(variants)) {
    for (const alias of aliases) {
      const idx = lower.indexOf(alias);
      if (idx !== -1) { map[headers[idx]] = field; break; }
    }
  }
  return map;
}

function parseCSV(raw: string, columnMap: Record<string, string>): ContactRow[] {
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  if (lines.length < 2) return [];

  const rawHeaders = splitCSVLine(lines[0]);
  const validTypes = ["lead", "client", "agent", "vendor"] as const;

  const rows: ContactRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCSVLine(lines[i]);
    const get = (field: string) => {
      const hi = rawHeaders.findIndex((h) => columnMap[h] === field);
      return hi !== -1 ? (cells[hi] ?? "").trim() : "";
    };
    const name = get("name");
    if (!name) continue;
    const rawType = get("type").toLowerCase() as (typeof validTypes)[number];
    rows.push({
      name,
      email: get("email") || undefined,
      phone: get("phone") || undefined,
      source: get("source") || undefined,
      type: validTypes.includes(rawType) ? rawType : "lead",
      tags: get("tags") ? get("tags").split(/[,;|]/).map((t) => t.trim()).filter(Boolean) : [],
      notes: get("notes") || undefined,
    });
  }
  return rows;
}

// ── Server Actions ────────────────────────────────────────────────────────────

/**
 * Parse raw CSV text and return a preview of the rows that would be imported.
 * Annotates each row with isDuplicate / existingId based on email lookup.
 */
export async function previewCSVImport(
  rawCsv: string,
  columnMapOverride?: Record<string, string>
): Promise<PreviewResult> {
  const userId = await requireUserId();

  const firstLine = rawCsv.replace(/\r\n/g, "\n").split("\n")[0] ?? "";
  const rawHeaders = splitCSVLine(firstLine);
  const columnMap = columnMapOverride ?? buildColumnMap(rawHeaders);

  const rows = parseCSV(rawCsv, columnMap);

  const emails = rows.map((r) => r.email).filter(Boolean) as string[];
  const existingContacts = emails.length > 0
    ? await prisma.contact.findMany({
        where: { userId, email: { in: emails } },
        select: { id: true, email: true },
      })
    : [];

  const existingEmailMap = new Map(existingContacts.map((c) => [c.email!, c.id]));

  const annotated = rows.map((r) => ({
    ...r,
    isDuplicate: r.email ? existingEmailMap.has(r.email) : false,
    existingId: r.email ? existingEmailMap.get(r.email) : undefined,
  }));

  return {
    rows: annotated,
    total: annotated.length,
    duplicates: annotated.filter((r) => r.isDuplicate).length,
    headers: rawHeaders,
    columnMap,
  };
}

/**
 * Commit a previously previewed import. Accepts the raw CSV and strategy,
 * then writes to the database.
 */
export async function commitCSVImport(
  rawCsv: string,
  dedupStrategy: DedupStrategy,
  columnMapOverride?: Record<string, string>
): Promise<CommitResult> {
  const userId = await requireUserId();

  const firstLine = rawCsv.replace(/\r\n/g, "\n").split("\n")[0] ?? "";
  const rawHeaders = splitCSVLine(firstLine);
  const columnMap = columnMapOverride ?? buildColumnMap(rawHeaders);
  const rows = parseCSV(rawCsv, columnMap);

  if (rows.length === 0) {
    return { created: 0, updated: 0, skipped: 0, errors: 1, errorDetails: ["No valid rows found"] };
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  for (const row of rows) {
    try {
      if (dedupStrategy !== "create" && row.email) {
        const existing = await prisma.contact.findFirst({
          where: { userId, email: row.email },
          select: { id: true },
        });
        if (existing) {
          if (dedupStrategy === "skip") { skipped++; continue; }
          await prisma.contact.update({
            where: { id: existing.id },
            data: {
              name: row.name,
              phone: row.phone ?? undefined,
              source: row.source ?? undefined,
              type: row.type,
              tags: row.tags,
              notes: row.notes ?? undefined,
            },
          });
          updated++;
          continue;
        }
      }

      await prisma.contact.create({
        data: {
          userId,
          name: row.name,
          email: row.email ?? null,
          phone: row.phone ?? null,
          source: row.source ?? null,
          type: row.type,
          tags: row.tags,
          notes: row.notes ?? null,
        },
      });
      created++;
    } catch (err) {
      errors++;
      if (err instanceof Error) errorDetails.push(`"${row.name}": ${err.message}`);
    }
  }

  revalidatePath("/contacts");
  revalidatePath("/dashboard");

  return { created, updated, skipped, errors, errorDetails };
}

/**
 * Return aggregate counts for the import page stats bar.
 */
export async function getImportStats(): Promise<{ total: number }> {
  const userId = await requireUserId();
  const total = await prisma.contact.count({ where: { userId } });
  return { total };
}
