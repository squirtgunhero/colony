import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { ActionDefinition } from "./types";

const parameters = z.object({
  source: z.enum(["csv", "hubspot", "paste"]),
  raw_csv: z.string().optional(),
  dedup_strategy: z.enum(["skip", "update", "create"]).default("skip"),
});

export const importContacts: ActionDefinition<typeof parameters> = {
  name: "importContacts",
  description:
    "Bulk import contacts from a CSV string, file upload, or HubSpot. " +
    "For 'paste' source, raw_csv must be provided. " +
    "For 'csv' and 'hubspot', the UI import panel handles file collection. " +
    "dedup_strategy controls what happens when a contact with the same email already exists: " +
    "'skip' leaves the existing record untouched, 'update' merges new fields, " +
    "'create' always creates a new record.",
  parameters,
  riskTier: 2,

  async execute(params, ctx) {
    const { source, raw_csv, dedup_strategy } = params;

    // For file / HubSpot sources the UI handles everything — return a
    // sentinel so the chat layer knows to open the ImportPanel.
    if (source !== "paste" || !raw_csv) {
      return {
        success: true,
        message: "Opening the import panel…",
        data: { __open_import_panel: true, source, dedup_strategy },
      };
    }

    // Parse and import pasted CSV inline
    const rows = parseCSVRows(raw_csv);
    if (rows.length === 0) {
      return { success: false, message: "No valid rows found in the pasted data." };
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const row of rows) {
      try {
        if (dedup_strategy !== "create" && row.email) {
          const existing = await prisma.contact.findFirst({
            where: { userId: ctx.profileId, email: row.email },
            select: { id: true },
          });

          if (existing) {
            if (dedup_strategy === "skip") { skipped++; continue; }
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
            updated++;
            continue;
          }
        }

        await prisma.contact.create({
          data: {
            userId: ctx.profileId,
            name: row.name,
            email: row.email ?? null,
            phone: row.phone ?? null,
            source: row.source ?? null,
            type: row.type ?? "lead",
            tags: row.tags ?? [],
            notes: row.notes ?? null,
          },
        });
        created++;
      } catch {
        errors++;
      }
    }

    return {
      success: true,
      message: `Imported ${created} contacts. Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}.`,
      data: { created, updated, skipped, errors },
    };
  },
};

// ── CSV helpers ──────────────────────────────────────────────────────────────

interface ContactRow {
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  type?: string;
  tags?: string[];
  notes?: string;
}

function parseCSVRows(raw: string): ContactRow[] {
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]).map((h) => h.toLowerCase().trim());
  const colIndex = (variants: string[]) =>
    variants.reduce((f, v) => (f !== -1 ? f : headers.indexOf(v)), -1);

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
    if (!name) continue;

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
