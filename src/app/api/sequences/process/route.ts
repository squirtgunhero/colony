import { NextResponse } from "next/server";
import { processSequences } from "@/lib/sequences/processor";

// Cron handler — runs every 15 minutes to process due sequence emails
export async function POST() {
  try {
    const result = await processSequences();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Sequences] Cron processing failed:", error);
    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 }
    );
  }
}
