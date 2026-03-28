import { NextResponse } from "next/server";
import { processDelayedWorkflows } from "@/lib/workflows/runtime";

/**
 * POST /api/workflows/process
 * Cron handler: resumes delayed workflow runs whose scheduledAt <= now().
 */
export async function POST() {
  try {
    const result = await processDelayedWorkflows();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Workflows Process]", error);
    return NextResponse.json(
      { error: "Failed to process workflows" },
      { status: 500 }
    );
  }
}
