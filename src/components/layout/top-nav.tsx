"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { UserMenu } from "@/components/auth/user-menu";
import { cn } from "@/lib/utils";
import { Bell, RefreshCw, Menu, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ContactDialog } from "@/components/contacts/contact-dialog";
import { globalSearch } from "@/app/(dashboard)/search/actions";

const navTabs = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Contacts", href: "/contacts" },
  { label: "Properties", href: "/properties" },
  { label: "Deals", href: "/deals" },
  { label: "Tasks", href: "/tasks" },
  { label: "Reports", href: "/reports" },
];

interface SearchResult {
  id: string;
  type: "contact" | "property" | "deal" | "task";
  title: string;
  subtitle?: string;
}

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Debounced search
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

  const handleResultClick = useCallback((result: SearchResult) => {
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
  }, [router]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
  }, []);

  return (
    <header className="sticky top-0 z-40 h-14 flex items-center justify-between px-6 bg-background border-b border-border" suppressHydrationWarning>
      {/* Left: Mobile Menu + Brand */}
      <div className="flex items-center gap-4" suppressHydrationWarning>
        {mounted ? (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
          <SheetContent 
            side="left" 
            className="w-72 p-0 bg-neutral-950 border-r border-neutral-800 text-neutral-100 [&>button]:text-neutral-400 [&>button]:hover:text-neutral-100" 
            aria-describedby={undefined}
          >
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <div className="flex h-full flex-col">
              <div className="flex h-14 items-center gap-3 border-b border-neutral-800 px-4">
                <Image
                  src="/colony-icon.svg"
                  alt="Colony"
                  width={24}
                  height={24}
                  className="h-6 w-6"
                />
                <span className="font-[family-name:var(--font-geist)] text-sm font-light tracking-[0.2em] uppercase text-neutral-100">
                  Colony
                </span>
              </div>

              <nav className="flex-1 p-3 space-y-1">
                {navTabs.map((tab) => {
                  const isActive = pathname === tab.href || 
                    (tab.href !== "/dashboard" && pathname.startsWith(tab.href));
                  return (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-neutral-800 text-neutral-100"
                          : "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/50"
                      )}
                    >
                      {tab.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t border-neutral-800 p-4">
                <ContactDialog onOpenChange={(isOpen) => isOpen && setOpen(false)}>
                  <Button 
                    className="w-full bg-neutral-100 text-neutral-900 hover:bg-neutral-200" 
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Contact
                  </Button>
                </ContactDialog>
              </div>
            </div>
          </SheetContent>
          </Sheet>
        ) : (
          <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden">
            <Menu className="h-4 w-4" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        )}

        <Link href="/dashboard" className="flex items-center gap-2 md:hidden" suppressHydrationWarning>
          <Image
            src="/colony-icon.svg"
            alt="Colony"
            width={24}
            height={24}
            className="h-6 w-6"
            suppressHydrationWarning
          />
        </Link>
      </div>

      {/* Center: Search Box */}
      <div className="hidden md:flex flex-1 max-w-md mx-4 relative">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            placeholder="Search contacts, properties, deals..."
            className="w-full h-9 pl-9 pr-8 rounded-lg border border-border bg-muted/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {isSearchFocused && (searchResults.length > 0 || isSearching || searchQuery.length >= 2) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50">
            {isSearching ? (
              <div className="p-3 text-sm text-muted-foreground text-center">
                Searching...
              </div>
            ) : searchResults.length > 0 ? (
              <div className="max-h-64 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground capitalize px-2 py-0.5 bg-muted rounded">
                      {result.type}
                    </span>
                  </button>
                ))}
              </div>
            ) : searchQuery.length >= 2 ? (
              <div className="p-3 text-sm text-muted-foreground text-center">
                No results found
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2" suppressHydrationWarning>
        <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:flex" suppressHydrationWarning>
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative" asChild suppressHydrationWarning>
          <Link href="/notifications">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
          </Link>
        </Button>
        <div className="ml-2 pl-2 border-l border-border" suppressHydrationWarning>
          {mounted && <UserMenu />}
        </div>
      </div>
    </header>
  );
}
