"use client";

// ============================================
// COLONY - Chat Mode Top Navigation
// Minimal, clean header for conversation view
// ============================================

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { UserMenu } from "@/components/auth/user-menu";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ViewToggle } from "./ViewToggle";

const mobileNavItems = [
  { label: "Home", href: "/chat" },
  { label: "Browse", href: "/browse" },
  { label: "Referrals", href: "/referrals" },
  { label: "Inbox", href: "/inbox" },
  { label: "Settings", href: "/settings" },
];

export function ChatTopNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <header 
      className="sticky top-0 z-40 h-14 flex items-center justify-between px-6 bg-background/80 backdrop-blur-sm border-b border-border/50" 
      suppressHydrationWarning
    >
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
                  {mobileNavItems.map((tab) => (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/50 transition-colors"
                    >
                      {tab.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden">
            <Menu className="h-4 w-4" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        )}

        <Link href="/chat" className="flex items-center gap-2 md:hidden" suppressHydrationWarning>
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

      {/* Center: View Toggle */}
      <div className="hidden md:flex items-center">
        <ViewToggle />
      </div>

      {/* Right: User */}
      <div className="flex items-center gap-2" suppressHydrationWarning>
        {mounted && <UserMenu />}
      </div>
    </header>
  );
}
