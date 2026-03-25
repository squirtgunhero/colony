import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { generateForecast } from "@/lib/deal-forecasting";

export async function GET() {
  try {
    const userId = await requireUserId();
    const forecast = await generateForecast(userId);
    return NextResponse.json(forecast);
  } catch (error) {
    console.error("[Forecast API]", error);
    return NextResponse.json({ error: "Failed to generate forecast" }, { status: 500 });
  }
}
