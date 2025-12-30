/**
 * GET/POST /api/layout
 * Layout persistence endpoints
 * Saves and loads dashboard layouts for users
 */

import { NextRequest, NextResponse } from "next/server";
import { persistence } from "@/lib/widget-builder/persistence";
import type { LayoutSpec, SaveLayoutRequest } from "@/lib/widget-builder/schemas";

// Hardcoded demo user ID (as per requirements)
const DEMO_USER_ID = "demo-user";

/**
 * GET /api/layout?pageId=home
 * Load layout for a specific page
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get("pageId") || "home";
    
    // Load layout from persistence
    const layout = await persistence.loadLayout(DEMO_USER_ID, pageId);
    
    if (!layout) {
      // Return empty layout structure for new pages
      return NextResponse.json({
        pageId,
        userId: DEMO_USER_ID,
        widgets: [],
        gridLayout: {
          left: [],
          main: [],
          right: [],
        },
        updatedAt: new Date().toISOString(),
      });
    }
    
    return NextResponse.json(layout);
    
  } catch (error) {
    console.error("Layout load error:", error);
    return NextResponse.json(
      { error: "Failed to load layout" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/layout
 * Save layout for a specific page
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as SaveLayoutRequest;
    
    // Basic validation
    if (!body.pageId) {
      return NextResponse.json(
        { error: "pageId is required" },
        { status: 400 }
      );
    }
    
    const { pageId, widgets, gridLayout } = body;
    
    // Save layout to persistence
    const savedLayout = await persistence.saveLayout(
      DEMO_USER_ID,
      pageId,
      { pageId, widgets: widgets || [], gridLayout: gridLayout || { left: [], main: [], right: [] } }
    );
    
    return NextResponse.json({
      ok: true,
      layout: savedLayout,
    });
    
  } catch (error) {
    console.error("Layout save error:", error);
    return NextResponse.json(
      { error: "Failed to save layout" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/layout?pageId=home
 * Delete layout for a specific page
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get("pageId") || "home";
    
    const deleted = await persistence.deleteLayout(DEMO_USER_ID, pageId);
    
    return NextResponse.json({
      ok: true,
      deleted,
    });
    
  } catch (error) {
    console.error("Layout delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete layout" },
      { status: 500 }
    );
  }
}
