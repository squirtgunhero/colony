"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { UserMenu } from "@/components/auth/user-menu";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { Menu, Search, X, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
// ContactDialog removed — quick capture FAB handles creation
import { globalSearch } from "@/app/(dashboard)/search/actions";

interface SearchResult {
  id: string;
  type: "contact" | "property" | "deal" | "task";
  title: string;
  subtitle?: string;
}

const mobileNavItems = [
  { label: "Home", href: "/dashboard" },
  { label: "People", href: "/browse/contacts" },
  { label: "Deals", href: "/browse/deals" },
  { label: "Properties", href: "/browse/properties" },
  { label: "Tasks", href: "/browse/tasks" },
  { label: "Marketing", href: "/marketing" },
  { label: "Calendar", href: "/calendar" },
  { label: "Inbox", href: "/inbox" },
  { label: "Reports", href: "/reports" },
  { label: "Settings", href: "/settings" },
];

export function BrowseTopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme } = useColonyTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await globalSearch(searchQuery);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      const routes: Record<string, string> = {
        contact: "/contacts",
        property: "/properties",
        deal: "/deals",
        task: "/tasks",
      };
      router.push(`${routes[result.type]}/${result.id}`);
      setSearchQuery("");
      setSearchResults([]);
      setIsSearchFocused(false);
    },
    [router]
  );

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
  }, []);

  const getPageTitle = () => {
    if (pathname.startsWith("/browse/contacts") || pathname.startsWith("/browse/companies")) return "People";
    const segments = pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (!last) return "";
    return last.charAt(0).toUpperCase() + last.slice(1);
  };

  return (
    <header
      className="sticky top-0 z-40 h-12 flex items-center gap-4 px-5"
      style={{
        backgroundColor: withAlpha(theme.bg, 0.8),
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderBottom: `0.5px solid ${withAlpha(theme.text, 0.06)}`,
      }}
      suppressHydrationWarning
    >
      {/* Mobile: hamburger + brand */}
      <div className="flex items-center gap-3 md:hidden" suppressHydrationWarning>
        {mounted ? (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-64 p-0 border-r"
              style={{
                backgroundColor: theme.bg,
                borderColor: withAlpha(theme.text, 0.06),
                fontFamily: "var(--font-dm-sans), sans-serif",
              }}
              aria-describedby={undefined}
            >
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <div className="flex h-full flex-col">
                <div
                  className="flex h-12 items-center gap-2.5 px-4"
                  style={{ borderBottom: `1px solid ${withAlpha(theme.text, 0.06)}` }}
                >
                  <Image src="/colony-icon.svg" alt="Colony" width={20} height={20} className="h-5 w-5" />
                  <span
                    className="text-[11px] font-light tracking-[0.18em] uppercase"
                    style={{ color: withAlpha(theme.text, 0.3) }}
                  >
                    Colony
                  </span>
                </div>

                <nav className="flex-1 p-3 space-y-0.5">
                  {mobileNavItems.map((tab) => {
                    const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
                    return (
                      <Link
                        key={tab.href}
                        href={tab.href}
                        onClick={() => setOpen(false)}
                        className="flex items-center h-10 px-3 rounded-xl text-[13px] transition-colors"
                        style={{
                          backgroundColor: isActive ? withAlpha(theme.text, 0.08) : "transparent",
                          color: isActive ? theme.text : withAlpha(theme.text, 0.5),
                          fontWeight: isActive ? 600 : 400,
                        }}
                      >
                        {tab.label}
                      </Link>
                    );
                  })}
                </nav>

                {/* Mobile Tara pill */}
                <div className="p-3" style={{ borderTop: `1px solid ${withAlpha(theme.text, 0.06)}` }}>
                  <Link
                    href="/chat"
                    className="flex items-center justify-center h-10 rounded-full transition-colors"
                    style={{
                      backgroundColor: withAlpha(theme.accent, 0.1),
                    }}
                    onClick={() => setOpen(false)}
                  >
                    <span
                      className="text-[13px] font-medium"
                      style={{ color: theme.accent }}
                    >
                      Tara
                    </span>
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Menu className="h-4 w-4" />
            <span className="sr-only">Menu</span>
          </Button>
        )}

        <Link href="/chat" className="flex items-center" suppressHydrationWarning>
          <Image src="/colony-icon.svg" alt="Colony" width={20} height={20} className="h-5 w-5" />
        </Link>
      </div>

      {/* Desktop: Page title */}
      <span
        className="hidden md:block text-[13px] font-medium"
        style={{ color: withAlpha(theme.text, 0.45) }}
      >
        {getPageTitle()}
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="hidden md:flex max-w-sm relative">
        <div className="relative w-full">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
            style={{ color: withAlpha(theme.text, 0.25) }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            placeholder="Search..."
            className="w-56 h-8 pl-8 pr-7 rounded-lg text-[12px] placeholder:text-muted-foreground focus:outline-none focus:w-72 transition-all duration-200"
            style={{
              backgroundColor: withAlpha(theme.text, 0.05),
              color: theme.text,
            }}
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:opacity-70"
            >
              <X className="h-3 w-3" style={{ color: withAlpha(theme.text, 0.4) }} />
            </button>
          )}
        </div>

        {isSearchFocused && (searchResults.length > 0 || isSearching || searchQuery.length >= 2) && (
          <div
            className="absolute top-full right-0 mt-2 w-72 rounded-xl overflow-hidden z-50"
            style={{
              backgroundColor: theme.bg,
              boxShadow: "var(--shadow-lg)",
              border: `0.5px solid ${withAlpha(theme.text, 0.08)}`,
            }}
          >
            {isSearching ? (
              <div className="p-3 text-[12px] text-center" style={{ color: withAlpha(theme.text, 0.4) }}>
                Searching...
              </div>
            ) : searchResults.length > 0 ? (
              <div className="max-h-64 overflow-y-auto py-1">
                {searchResults.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors rounded-lg mx-1"
                    style={{ color: theme.text, width: "calc(100% - 8px)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = withAlpha(theme.text, 0.05))}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-[11px] truncate" style={{ color: withAlpha(theme.text, 0.4) }}>
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                    <span
                      className="text-[10px] capitalize px-1.5 py-0.5 rounded-md font-medium"
                      style={{
                        backgroundColor: withAlpha(theme.text, 0.05),
                        color: withAlpha(theme.text, 0.45),
                      }}
                    >
                      {result.type}
                    </span>
                  </button>
                ))}
              </div>
            ) : searchQuery.length >= 2 ? (
              <div className="p-3 text-[12px] text-center" style={{ color: withAlpha(theme.text, 0.4) }}>
                No results
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-1" suppressHydrationWarning>
        <Button variant="ghost" size="icon" className="h-7 w-7 relative" asChild>
          <Link href="/notifications" title="Notifications">
            <Bell className="h-3.5 w-3.5" style={{ color: withAlpha(theme.text, 0.35) }} />
          </Link>
        </Button>
      </div>

      {/* Mobile-only user menu */}
      <div className="md:hidden" suppressHydrationWarning>
        {mounted && <UserMenu size="sm" />}
      </div>
    </header>
  );
}
