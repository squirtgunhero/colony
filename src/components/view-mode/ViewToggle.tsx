"use client";

import { useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LayoutGrid, MessageCircle } from "lucide-react";
import { useModeStore } from "@/lib/mode";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";

export function ViewToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const { viewMode, setViewMode, lastClassicRoute, setLastClassicRoute } =
    useModeStore();
  const { theme } = useColonyTheme();

  // Track last classic route when navigating within classic view
  useEffect(() => {
    const classicRoutes = [
      "/contacts",
      "/deals",
      "/properties",
      "/tasks",
      "/inbox",
      "/referrals",
      "/reports",
      "/settings",
      "/browse",
      "/notifications",
      "/documents",
      "/activities",
      "/dashboard",
      "/search",
      "/email",
      "/export",
      "/favorites",
    ];
    if (classicRoutes.some((r) => pathname.startsWith(r))) {
      setLastClassicRoute(pathname);
    }
  }, [pathname, setLastClassicRoute]);

  // Auto-set viewMode based on current route
  useEffect(() => {
    if (pathname === "/chat" || pathname === "/") {
      setViewMode("chat");
    } else if (pathname !== "/sign-in" && pathname !== "/sign-up") {
      setViewMode("classic");
    }
  }, [pathname, setViewMode]);

  const toggle = useCallback(() => {
    if (viewMode === "chat") {
      setViewMode("classic");
      // Only restore last route if it was a browse route (not settings/notifications)
      const safeFallbacks = ["/browse", "/contacts", "/deals", "/properties", "/dashboard"];
      const restoreTo = lastClassicRoute && safeFallbacks.some((r) => lastClassicRoute.startsWith(r))
        ? lastClassicRoute
        : "/browse/contacts";
      router.push(restoreTo);
    } else {
      setViewMode("chat");
      router.push("/chat");
    }
  }, [viewMode, setViewMode, lastClassicRoute, router]);

  // Keyboard shortcut: Cmd+. (Mac) / Ctrl+. (Windows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggle]);

  const isChatView = viewMode === "chat";
  const label = isChatView ? "Switch to Classic View" : "Switch to Chat";
  const Icon = isChatView ? LayoutGrid : MessageCircle;

  return (
    <button
      onClick={toggle}
      className="fixed top-4 right-4 z-[70] flex items-center justify-center h-9 w-9 rounded-xl transition-all duration-200 group"
      style={{
        backgroundColor: withAlpha(theme.accent, 0.08),
        border: `1px solid ${withAlpha(theme.accent, 0.15)}`,
      }}
      aria-label={label}
    >
      <Icon
        className="h-4 w-4 transition-colors duration-200"
        style={{ color: withAlpha(theme.accent, 0.6) }}
      />

      {/* Tooltip */}
      <span
        className="absolute right-full mr-2 px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200"
        style={{
          backgroundColor: withAlpha(theme.text, 0.1),
          color: theme.textMuted,
          fontFamily: "var(--font-dm-sans), sans-serif",
        }}
      >
        {label}
        <span className="ml-1.5 opacity-50">
          {typeof navigator !== "undefined" &&
          navigator.platform?.includes("Mac")
            ? "\u2318."
            : "Ctrl+."}
        </span>
      </span>
    </button>
  );
}
