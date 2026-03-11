// ============================================================================
// POST /api/import/csv
// Accepts a JSON body with { raw_csv, dedup_strategy, preview_only }
// Returns parsed rows (preview) or executes bulk upsert (commit).
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ContactRow {
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  type: "lead" | "client" | "agent" | "vendor";
  tags: string[];
  notes?: string;
  /** Set during preview to indicate a potential duplicate */
  isDuplicate?: boolean;
  /** Existing contact ID if a match was found */
  existingId?: string;
}

export interface ImportPreviewResponse {
  rows: ContactRow[];
  total: number;
  duplicates: number;
  headers: string[];
  columnMap: Record<string, string>;
}

export interface ImportCommitResponse {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  errorDetails?: string[];
}

type DedupStrategy = "skip" | "update" | "create";

// ── CSV Parsing ───────────────────────────────────────────────────────────────

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

/**
 * Auto-detect which CSV column maps to which contact field.
 * Returns a map of { csvHeader → contactField }.
 */
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
      if (idx !== -1) {
        map[headers[idx]] = field;
        break;
      }
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
    const get = (field: string): string => {
      const headerIdx = rawHeaders.findIndex((h) => columnMap[h] === field);
      return headerIdx !== -1 ? (cells[headerIdx] ?? "").trim() : "";
    };

    const name = get("name");
    if (!name) continue;

    const rawType = get("type").toLowerCase() as (typeof validTypes)[number];
    const type = validTypes.includes(rawType) ? rawType : "lead";

    rows.push({
      name,
      email: get("email") || undefined,
      phone: get("phone") || undefined,
      source: get("source") || undefined,
      type,
      tags: get("tags")
        ? get("tags").split(/[,;|]/).map((t) => t.trim()).filter(Boolean)
        : [],
      notes: get("notes") || undefined,
    });
  }
  return rows;
}

// ── Auth helper ───────────────────────────────────────────────────────────────

async function getUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ── Route handlers ─────────────────────────────────────────────────────────────

/**
 * POST /api/import/csv
 *
 * Body (JSON):
 * {
 *   raw_csv: string;          // Raw CSV text
 *   column_map?: Record<string,string>; // Override auto-detected column map
 *   dedup_strategy?: "skip" | "update" | "create"; // default "skip"
 *   preview_only?: boolean;   // If true, return rows without writing to DB
 * }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    raw_csv?: string;
    column_map?: Record<string, string>;
    dedup_strategy?: DedupStrategy;
    preview_only?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { raw_csv, dedup_strategy = "skip", preview_only = false } = body;

  if (!raw_csv || typeof raw_csv !== "string" || raw_csv.trim().length === 0) {
    return NextResponse.json({ error: "raw_csv is required" }, { status: 400 });
  }

  // Parse headers and build column map
  const firstLine = raw_csv.replace(/\r\n/g, "\n").split("\n")[0] ?? "";
  const rawHeaders = splitCSVLine(firstLine);
  const columnMap = body.column_map ?? buildColumnMap(rawHeaders);

  // Parse all rows
  const rows = parseCSV(raw_csv, columnMap);
  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid rows found. Make sure your CSV has a 'name' column." }, { status: 422 });
  }

  // ── Preview mode ─────────────────────────────────────────────────────────
  if (preview_only) {
    // Check which emails are duplicates
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

    const response: ImportPreviewResponse = {
      rows: annotated,
      total: annotated.length,
      duplicates: annotated.filter((r) => r.isDuplicate).length,
      headers: rawHeaders,
      columnMap,
    };

    return NextResponse.json(response);
  }

  // ── Commit mode ───────────────────────────────────────────────────────────
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  for (const row of rows) {
    try {
      if (dedup_strategy !== "create" && row.email) {
        const existing = await prisma.contact.findFirst({
          where: { userId, email: row.email },
          select: { id: true },
        });

        if (existing) {
          if (dedup_strategy === "skip") { skipped++; continue; }
          // dedup_strategy === "update"
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
      if (err instanceof Error) errorDetails.push(`Row "${row.name}": ${err.message}`);
    }
  }

  // Revalidate contacts and dashboard pages
  revalidatePath("/contacts");
  revalidatePath("/dashboard");

  const response: ImportCommitResponse = { created, updated, skipped, errors, errorDetails };
  return NextResponse.json(response);
}
