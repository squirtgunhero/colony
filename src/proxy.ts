import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  // Allow public access to OG image routes
  if (
    request.nextUrl.pathname.startsWith("/api/og") ||
    request.nextUrl.pathname.startsWith("/opengraph-image")
  ) {
    return NextResponse.next();
  }

  // Allow public access to widget-builder for demo purposes
  // (uses hardcoded demo-user ID, no auth required)
  if (
    request.nextUrl.pathname.startsWith("/widget-builder") ||
    request.nextUrl.pathname.startsWith("/api/widget") ||
    request.nextUrl.pathname.startsWith("/api/layout")
  ) {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/og|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

