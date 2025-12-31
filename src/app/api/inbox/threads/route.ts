import { NextRequest, NextResponse } from "next/server";
import { getInboxThreads, type ThreadFilters } from "@/lib/db/inbox";
import { getUser } from "@/lib/supabase/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    
    const filters: ThreadFilters = {
      status: (searchParams.get("status") as ThreadFilters["status"]) || "open",
      assignedToMe: searchParams.get("assignedToMe") === "true",
      teamId: searchParams.get("teamId") || undefined,
      channel: (searchParams.get("channel") as ThreadFilters["channel"]) || undefined,
      unreadOnly: searchParams.get("unreadOnly") === "true",
      search: searchParams.get("search") || undefined,
    };

    const cursor = searchParams.get("cursor") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const result = await getInboxThreads(filters, cursor, limit);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch inbox threads:", error);
    return NextResponse.json(
      { error: "Failed to fetch threads" },
      { status: 500 }
    );
  }
}

