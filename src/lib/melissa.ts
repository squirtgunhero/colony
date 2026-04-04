import { prisma } from "@/lib/prisma";

const MELISSA_API_URL =
  "https://property.melissadata.net/v4/WEB/LookupProperty";
const DEFAULT_MONTHLY_LIMIT = 1000;

export interface MelissaPropertyData {
  parcelId: string | null;
  fips: string | null;
  yearBuilt: number | null;
  lotSizeAcres: number | null;
  lotSizeSqft: number | null;
  zoning: string | null;
  propertyType: string | null;
  stories: number | null;
  assessedValue: number | null;
  marketValue: number | null;
  taxAmount: number | null;
  taxYear: number | null;
  ownerName: string | null;
  ownerOccupied: boolean | null;
  lastSaleDate: string | null;
  lastSalePrice: number | null;
  county: string | null;
  subdivision: string | null;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
}

function getMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthlyLimit(): number {
  const envLimit = process.env.MELISSA_MONTHLY_LIMIT;
  if (envLimit) {
    const parsed = parseInt(envLimit, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_MONTHLY_LIMIT;
}

function toStringOrNull(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function toNumberOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

function toIntOrNull(value: unknown): number | null {
  const num = toNumberOrNull(value);
  if (num === null) return null;
  return Math.round(num);
}

function toBooleanOrNull(value: unknown): boolean | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "boolean") return value;
  const str = String(value).toLowerCase();
  if (str === "yes" || str === "true" || str === "y" || str === "1")
    return true;
  if (str === "no" || str === "false" || str === "n" || str === "0")
    return false;
  return null;
}

function mapRecord(record: Record<string, any>): MelissaPropertyData {
  return {
    parcelId: toStringOrNull(record?.Parcel?.APN),
    fips: toStringOrNull(record?.Parcel?.FIPSCode),
    yearBuilt: toIntOrNull(record?.Building?.YearBuilt),
    lotSizeAcres: toNumberOrNull(record?.Lot?.LotSizeAcres),
    lotSizeSqft: toNumberOrNull(record?.Lot?.LotSizeSqFt),
    zoning: toStringOrNull(record?.Parcel?.Zoning),
    propertyType: toStringOrNull(record?.Parcel?.PropertyTypeCode),
    stories: toIntOrNull(record?.Building?.Stories),
    assessedValue: toNumberOrNull(record?.Values?.AssessedValue),
    marketValue: toNumberOrNull(record?.Values?.MarketValue),
    taxAmount: toNumberOrNull(record?.Values?.TaxAmount),
    taxYear: toIntOrNull(record?.Values?.TaxYear),
    ownerName: toStringOrNull(record?.Owner?.Name),
    ownerOccupied: toBooleanOrNull(record?.Owner?.OwnerOccupied),
    lastSaleDate: toStringOrNull(record?.CurrentSale?.SaleDate),
    lastSalePrice: toNumberOrNull(record?.CurrentSale?.SalePrice),
    county: toStringOrNull(record?.PropertyAddress?.County),
    subdivision: toStringOrNull(record?.PropertyAddress?.Subdivision),
    latitude: toNumberOrNull(record?.PropertyAddress?.Latitude),
    longitude: toNumberOrNull(record?.PropertyAddress?.Longitude),
    bedrooms: toIntOrNull(record?.Building?.Bedrooms),
    bathrooms: toNumberOrNull(record?.Building?.Bathrooms),
    sqft: toNumberOrNull(record?.SquareFootage?.AreaBuilding),
    address: toStringOrNull(record?.PropertyAddress?.AddressLine1),
    city: toStringOrNull(record?.PropertyAddress?.City),
    state: toStringOrNull(record?.PropertyAddress?.State),
    zipCode: toStringOrNull(record?.PropertyAddress?.Zip),
  };
}

export async function getUsage(
  userId: string
): Promise<{ used: number; limit: number; remaining: number; month: string }> {
  const month = getMonthKey();
  const limit = getMonthlyLimit();
  const used = await prisma.melissaApiUsage.count({
    where: { userId, month },
  });
  return { used, limit, remaining: Math.max(0, limit - used), month };
}

export interface MelissaLookupInput {
  freeform?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

export async function lookupProperty(
  input: string | MelissaLookupInput,
  userId: string
): Promise<MelissaPropertyData | null> {
  const apiKey = process.env.MELISSA_DATA_API_KEY;
  if (!apiKey) {
    console.warn(
      "MELISSA_DATA_API_KEY is not set. Skipping Melissa property lookup."
    );
    return null;
  }

  // Check monthly usage limit
  const usage = await getUsage(userId);
  if (usage.remaining <= 0) {
    throw new Error(
      `Melissa API monthly limit reached (${usage.limit}). Resets next month. Used: ${usage.used}, Remaining: ${usage.remaining}.`
    );
  }

  // Build request URL — use structured params when available (more precise),
  // fall back to freeform address string
  const url = new URL(MELISSA_API_URL);
  url.searchParams.set("id", apiKey);
  url.searchParams.set("cols", "GrpAll");

  let addressForLog: string;

  if (typeof input === "string") {
    url.searchParams.set("ff", input);
    addressForLog = input;
  } else if (input.addressLine1) {
    // Set F: a1 + postal  OR  Set G: a1 + city + state
    url.searchParams.set("a1", input.addressLine1);
    if (input.postalCode) {
      url.searchParams.set("postal", input.postalCode);
    }
    if (input.city) {
      url.searchParams.set("city", input.city);
    }
    if (input.state) {
      url.searchParams.set("state", input.state);
    }
    addressForLog = [input.addressLine1, input.city, input.state, input.postalCode].filter(Boolean).join(", ");
  } else if (input.freeform) {
    url.searchParams.set("ff", input.freeform);
    addressForLog = input.freeform;
  } else {
    return null;
  }

  let data: any;
  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(
        `Melissa API returned HTTP ${response.status}: ${response.statusText}`
      );
    }
    data = await response.json();
  } catch (error: any) {
    if (error.message?.includes("Melissa API returned HTTP")) {
      throw error;
    }
    throw new Error(
      `Failed to reach Melissa API: ${error.message || "Network error"}`
    );
  }

  // Track usage
  const month = getMonthKey();
  await prisma.melissaApiUsage.create({
    data: {
      userId,
      endpoint: "LookupProperty",
      address: addressForLog,
      month,
    },
  });

  // Check for empty response
  if (!data?.Records || data.Records.length === 0) {
    return null;
  }

  return mapRecord(data.Records[0]);
}
