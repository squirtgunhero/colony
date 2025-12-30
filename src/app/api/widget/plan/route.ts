/**
 * POST /api/widget/plan
 * Natural language command parser endpoint
 * Takes text input and returns a validated WidgetSpec or error
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseWidgetCommand } from "@/lib/widget-builder/parser";
import type { WidgetSpec } from "@/lib/widget-builder/schemas";

// Request body schema
const RequestSchema = z.object({
  text: z.string().min(1, "Command text is required"),
});

// Success response type
interface SuccessResponse {
  ok: true;
  widgetSpec: WidgetSpec;
}

// Error response type
interface ErrorResponse {
  ok: false;
  error: string;
  needsClarification?: boolean;
  suggestions?: string[];
}

type PlanResponse = SuccessResponse | ErrorResponse;

export async function POST(request: NextRequest): Promise<NextResponse<PlanResponse>> {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request
    const parseResult = RequestSchema.safeParse(body);
    if (!parseResult.success) {
      // Get first error message using Zod 4 API
      const firstError = parseResult.error.issues?.[0]?.message || "Invalid request";
      return NextResponse.json({
        ok: false,
        error: firstError,
        needsClarification: true,
        suggestions: [
          "Add a KPI card showing new leads last 7 days",
          "Create a leads table filtered to Manhattan",
          "Add a pipeline kanban on the right",
        ],
      }, { status: 400 });
    }
    
    const { text } = parseResult.data;
    
    // Parse the natural language command
    const commandResult = parseWidgetCommand(text);
    
    if (!commandResult.ok) {
      return NextResponse.json({
        ok: false,
        error: commandResult.error,
        needsClarification: commandResult.needsClarification,
        suggestions: commandResult.suggestions,
      }, { status: 400 });
    }
    
    const { widgetSpec } = commandResult;
    
    // Basic validation - ensure required fields exist
    if (!widgetSpec.id || !widgetSpec.widgetType || !widgetSpec.placement) {
      return NextResponse.json({
        ok: false,
        error: "Generated widget spec is incomplete",
      }, { status: 500 });
    }
    
    // Return the widget spec
    return NextResponse.json({
      ok: true,
      widgetSpec,
    });
    
  } catch (error) {
    console.error("Widget plan error:", error);
    
    return NextResponse.json({
      ok: false,
      error: "Internal server error while processing command",
    }, { status: 500 });
  }
}
