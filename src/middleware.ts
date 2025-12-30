import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Allow public access to OG image routes
  if (request.nextUrl.pathname.startsWith('/api/og') || 
      request.nextUrl.pathname.startsWith('/opengraph-image')) {
    return NextResponse.next();
  }
  
  // Allow public access to widget-builder for demo purposes
  // (uses hardcoded demo-user ID, no auth required)
  if (request.nextUrl.pathname.startsWith('/widget-builder') ||
      request.nextUrl.pathname.startsWith('/api/widget') ||
      request.nextUrl.pathname.startsWith('/api/layout')) {
    return NextResponse.next();
  }
  
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/og (Open Graph image - public)
     * - Static assets (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/og|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
