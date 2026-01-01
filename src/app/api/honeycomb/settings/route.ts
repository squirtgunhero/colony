import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import type { SettingsResponse, HoneycombSettings } from "@/lib/honeycomb/types";

/**
 * GET /api/honeycomb/settings
 * Returns user settings for Honeycomb
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return default settings
    const defaultSettings: HoneycombSettings = {
      profile: {
        displayName: user.user_metadata?.full_name || "",
        email: user.email || "",
        company: "",
        avatarUrl: user.user_metadata?.avatar_url,
      },
      notifications: {
        emailAlerts: true,
        campaignUpdates: true,
        weeklyReports: false,
        budgetAlerts: true,
      },
      integrations: [],
      timezone: "UTC",
      currency: "USD",
    };

    const response: SettingsResponse = {
      settings: defaultSettings,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to get honeycomb settings:", error);
    return NextResponse.json(
      { error: "Failed to get settings" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/honeycomb/settings
 * Update user settings for Honeycomb
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updates = await request.json();

    // For now, just return the updates merged with defaults
    // In a real implementation, this would persist to database
    const defaultSettings: HoneycombSettings = {
      profile: {
        displayName: user.user_metadata?.full_name || "",
        email: user.email || "",
        company: "",
        avatarUrl: user.user_metadata?.avatar_url,
      },
      notifications: {
        emailAlerts: true,
        campaignUpdates: true,
        weeklyReports: false,
        budgetAlerts: true,
      },
      integrations: [],
      timezone: "UTC",
      currency: "USD",
    };

    const mergedSettings: HoneycombSettings = {
      ...defaultSettings,
      ...updates,
      profile: { ...defaultSettings.profile, ...updates.profile },
      notifications: { ...defaultSettings.notifications, ...updates.notifications },
    };

    const response: SettingsResponse = {
      settings: mergedSettings,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to update honeycomb settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

