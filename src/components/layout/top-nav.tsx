"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { SignedIn, UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Bell, RefreshCw, Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const navTabs = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Leads", href: "/contacts" },
  { label: "Properties", href: "/properties" },
  { label: "Deals", href: "/deals" },
  { label: "Tasks", href: "/tasks" },
  { label: "Reports", href: "/reports" },
];

export function TopNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering client-specific content after mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <header className="sticky top-0 z-40 h-14 flex items-center justify-between px-6 bg-background border-b border-border" suppressHydrationWarning>
      {/* Left: Mobile Menu + Brand */}
      <div className="flex items-center gap-4" suppressHydrationWarning>
        {/* Mobile Menu - Only render after mount to avoid hydration mismatch */}
        {mounted ? (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0" aria-describedby={undefined}>
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <div className="flex h-full flex-col">
              {/* Mobile Header */}
              <div className="flex h-14 items-center gap-3 border-b border-border px-4">
                <Image
                  src="/colony-icon.svg"
                  alt="Colony"
                  width={24}
                  height={24}
                  className="h-6 w-6"
                />
                <span className="font-[family-name:var(--font-geist)] text-sm font-light tracking-[0.2em] uppercase">
                  Colony
                </span>
              </div>

              {/* Navigation Links */}
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
                        "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-neutral-100 dark:bg-neutral-800 text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                      )}
                    >
                      {tab.label}
                    </Link>
                  );
                })}
              </nav>

              {/* Bottom Actions */}
              <div className="border-t border-border p-4">
                <Button className="w-full" size="sm" onClick={() => setOpen(false)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Lead
                </Button>
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

        {/* Brand - Hidden on desktop (shown in sidebar) */}
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

      {/* Center: Navigation Tabs (Desktop) */}
      <nav className="hidden md:flex items-center" suppressHydrationWarning>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-neutral-100 dark:bg-neutral-800/50" suppressHydrationWarning>
          {navTabs.map((tab) => {
            const isActive = pathname === tab.href || 
              (tab.href !== "/dashboard" && pathname.startsWith(tab.href));
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-150",
                  isActive
                    ? "bg-white dark:bg-neutral-700 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                suppressHydrationWarning
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Right: Actions */}
      <div className="flex items-center gap-2" suppressHydrationWarning>
        <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:flex" suppressHydrationWarning>
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative" suppressHydrationWarning>
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
        </Button>
        <div className="ml-2 pl-2 border-l border-border" suppressHydrationWarning>
          {mounted && (
            <SignedIn>
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "h-8 w-8",
                  },
                }}
              />
            </SignedIn>
          )}
        </div>
      </div>
    </header>
  );
}
