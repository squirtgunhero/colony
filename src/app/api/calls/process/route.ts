import { NextResponse } from "next/server";
import { processAllPendingRecordings } from "@/lib/calls/transcribe";

// Cron handler: process pending call recordings (transcribe + analyze)
export async function POST() {
  try {
    const result = await processAllPendingRecordings();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[CallIntel] Cron processing failed:", error);
    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 }
    );
  }
}
