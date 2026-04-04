// ============================================================================
// POST /api/properties/import
// Import properties from a CSV file (multipart form data)
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { prisma } from "@/lib/prisma";

// ---- CSV parsing -----------------------------------------------------------

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map(parseCSVLine);
  return { headers, rows };
}

// ---- Format detection & column mapping ------------------------------------

type ColumnMap = {
  address: number;
  city: number;
  state: number;
  zip: number;
  price: number;
  ownerName: number;
  yearBuilt: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  lotSize: number;
  parcelId: number;
  propertyType: number;
  lastSaleDate: number;
  lastSalePrice: number;
};

function findCol(headers: string[], ...candidates: string[]): number {
  const lower = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  for (const c of candidates) {
    const normalized = c.toLowerCase().replace(/[^a-z0-9]/g, "");
    const idx = lower.indexOf(normalized);
    if (idx !== -1) return idx;
  }
  return -1;
}

function detectColumns(headers: string[]): ColumnMap {
  return {
    address: findCol(headers, "Property Address", "property_address", "address"),
    city: findCol(headers, "City", "property_city", "city"),
    state: findCol(headers, "State", "property_state", "state"),
    zip: findCol(headers, "Zip", "property_zip", "zip", "zipcode", "zip_code"),
    price: findCol(headers, "Estimated Value", "estimated_value", "price", "value"),
    ownerName: findCol(headers, "Owner Name", "owner_name", "owner_first_name", "owner"),
    yearBuilt: findCol(headers, "Year Built", "year_built", "yearbuilt"),
    bedrooms: findCol(headers, "Bedrooms", "bedrooms", "beds"),
    bathrooms: findCol(headers, "Bathrooms", "bathrooms", "baths"),
    sqft: findCol(headers, "Living Area", "living_area", "sqft", "square_feet", "squarefeet"),
    lotSize: findCol(headers, "Lot Size", "lot_size", "lotsize", "lot_size_sqft"),
    parcelId: findCol(headers, "APN", "apn", "parcel_id", "parcelid"),
    propertyType: findCol(headers, "Property Type", "property_type", "propertytype"),
    lastSaleDate: findCol(headers, "Last Sale Date", "last_sale_date", "sale_date"),
    lastSalePrice: findCol(headers, "Last Sale Amount", "last_sale_amount", "last_sale_price", "sale_price"),
  };
}

function getVal(row: string[], idx: number): string | undefined {
  if (idx < 0 || idx >= row.length) return undefined;
  const v = row[idx].trim();
  return v.length > 0 ? v : undefined;
}

function toFloat(val: string | undefined): number | undefined {
  if (!val) return undefined;
  const cleaned = val.replace(/[$,]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? undefined : n;
}

function toInt(val: string | undefined): number | undefined {
  if (!val) return undefined;
  const cleaned = val.replace(/[$,]/g, "");
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? undefined : n;
}

// ---- Normalization ---------------------------------------------------------

function normalizeAddress(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, " ");
}

// ---- Handler ---------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "CSV file is required" },
        { status: 400 }
      );
    }

    const text = await file.text();
    const { headers, rows } = parseCSV(text);

    if (headers.length === 0 || rows.length === 0) {
      return NextResponse.json(
        { error: "CSV file is empty or has no data rows" },
        { status: 400 }
      );
    }

    const cols = detectColumns(headers);

    if (cols.address < 0) {
      return NextResponse.json(
        { error: "Could not detect an address column in the CSV" },
        { status: 400 }
      );
    }

    // Handle BatchLeads owner name split (owner_first_name + owner_last_name)
    const ownerLastIdx = findCol(headers, "owner_last_name");

    // Fetch existing property addresses for dedup
    const existing = await prisma.property.findMany({
      where: { userId },
      select: { address: true, city: true },
    });

    const existingSet = new Set(
      existing.map((p) =>
        normalizeAddress([p.address, p.city].filter(Boolean).join(", "))
      )
    );

    // Map rows to property records
    const toCreate: Array<{
      userId: string;
      address: string;
      city: string;
      state: string | undefined;
      zipCode: string | undefined;
      price: number;
      ownerName: string | undefined;
      yearBuilt: number | undefined;
      bedrooms: number | undefined;
      bathrooms: number | undefined;
      sqft: number | undefined;
      lotSizeSqft: number | undefined;
      parcelId: string | undefined;
      propertyType: string | undefined;
      lastSaleDate: Date | undefined;
      lastSalePrice: number | undefined;
      importSource: string;
    }> = [];

    let skipped = 0;

    for (const row of rows) {
      const address = getVal(row, cols.address);
      if (!address) {
        skipped++;
        continue;
      }

      const city = getVal(row, cols.city) || "";
      const state = getVal(row, cols.state);
      const zip = getVal(row, cols.zip);
      const price = toFloat(getVal(row, cols.price)) ?? 0;

      // Build owner name from split fields if needed
      let ownerName = getVal(row, cols.ownerName);
      if (ownerLastIdx >= 0) {
        const last = getVal(row, ownerLastIdx);
        if (ownerName && last) {
          ownerName = `${ownerName} ${last}`;
        } else if (last) {
          ownerName = last;
        }
      }

      // Dedup check
      const key = normalizeAddress([address, city].filter(Boolean).join(", "));
      if (existingSet.has(key)) {
        skipped++;
        continue;
      }
      existingSet.add(key); // prevent dupes within this import batch

      // Parse last sale date
      let lastSaleDate: Date | undefined;
      const saleDateStr = getVal(row, cols.lastSaleDate);
      if (saleDateStr) {
        const parsed = new Date(saleDateStr);
        if (!isNaN(parsed.getTime())) {
          lastSaleDate = parsed;
        }
      }

      toCreate.push({
        userId,
        address,
        city,
        state,
        zipCode: zip,
        price,
        ownerName,
        yearBuilt: toInt(getVal(row, cols.yearBuilt)),
        bedrooms: toInt(getVal(row, cols.bedrooms)),
        bathrooms: toFloat(getVal(row, cols.bathrooms)),
        sqft: toFloat(getVal(row, cols.sqft)),
        lotSizeSqft: toFloat(getVal(row, cols.lotSize)),
        parcelId: getVal(row, cols.parcelId),
        propertyType: getVal(row, cols.propertyType),
        lastSaleDate,
        lastSalePrice: toFloat(getVal(row, cols.lastSalePrice)),
        importSource: "csv",
      });
    }

    // Bulk create
    let created = 0;
    if (toCreate.length > 0) {
      const result = await prisma.property.createMany({
        data: toCreate as any,
        skipDuplicates: true,
      });
      created = result.count;
    }

    return NextResponse.json({
      created,
      skipped,
      total: rows.length,
    });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[IMPORT] Error:", error);
    return NextResponse.json(
      { error: error.message || "Import failed" },
      { status: 500 }
    );
  }
}
