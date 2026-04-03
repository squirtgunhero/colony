import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Define public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/reset-password",
    "/auth/callback",
    "/auth/confirm",
    "/api/og",
    "/opengraph-image",
  ];
  
  const isPublicRoute = publicRoutes.some(
    (route) => request.nextUrl.pathname === route || 
    request.nextUrl.pathname.startsWith("/sign-in") ||
    request.nextUrl.pathname.startsWith("/sign-up") ||
    request.nextUrl.pathname.startsWith("/forgot-password") ||
    request.nextUrl.pathname.startsWith("/reset-password") ||
    request.nextUrl.pathname.startsWith("/auth/") ||
    request.nextUrl.pathname.startsWith("/api/og") ||
    request.nextUrl.pathname.startsWith("/opengraph-image") ||
    request.nextUrl.pathname.startsWith("/api/sms/") ||
    request.nextUrl.pathname.startsWith("/api/cron/") ||
    request.nextUrl.pathname.startsWith("/marketplace") ||
    request.nextUrl.pathname.startsWith("/api/marketplace") ||
    request.nextUrl.pathname.startsWith("/api/chatbot/") ||
    request.nextUrl.pathname.startsWith("/api/ads/") ||
    request.nextUrl.pathname.startsWith("/api/calls/recording-status") ||
    request.nextUrl.pathname.startsWith("/api/dialer/outbound")
  );

  // CSRF protection: verify origin on mutation API requests
  const isMutationMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");
  // Skip CSRF for webhook/cron endpoints (they use their own auth)
  const csrfExempt =
    request.nextUrl.pathname.startsWith("/api/sms/") ||
    request.nextUrl.pathname.startsWith("/api/cron/") ||
    request.nextUrl.pathname.startsWith("/api/chatbot/") ||
    request.nextUrl.pathname.startsWith("/api/ads/") ||
    request.nextUrl.pathname.startsWith("/api/calls/recording-status") ||
    request.nextUrl.pathname.startsWith("/api/dialer/outbound");

  if (isMutationMethod && isApiRoute && !csrfExempt) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) {
      const origin = request.headers.get("origin");
      if (origin) {
        try {
          const originHost = new URL(origin).host;
          const appHost = new URL(appUrl).host;
          if (originHost !== appHost) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
          }
        } catch {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }
  }

  if (!user && !isPublicRoute) {
    // No user, redirect to sign-in
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  // If user is signed in and tries to access auth pages (except reset-password), redirect to Home (/chat)
  const authPagesForLoggedInRedirect = ["/sign-in", "/sign-up", "/forgot-password"];
  const shouldRedirectToHome = user && authPagesForLoggedInRedirect.some(
    (route) => request.nextUrl.pathname.startsWith(route)
  );

  if (shouldRedirectToHome) {
    const url = request.nextUrl.clone();
    url.pathname = "/chat";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

