"use client";

// ============================================
// COLONY - Browse Mode Top Navigation
// Navigation tabs for different entity types
// ============================================

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/auth/user-menu";
import { cn } from "@/lib/utils";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { Menu, Users, Home, Handshake, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const browseTabs = [
  { label: "Contacts", href: "/browse/contacts", icon: Users },
  { label: "Properties", href: "/browse/properties", icon: Home },
  { label: "Deals", href: "/browse/deals", icon: Handshake },
];

const mobileNavItems = [
  { label: "Home", href: "/chat" },
  { label: "Browse", href: "/browse" },
  { label: "Referrals", href: "/referrals" },
  { label: "Inbox", href: "/inbox" },
  { label: "Settings", href: "/settings" },
];

export function BrowseTopNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme } = useColonyTheme();

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 h-14 flex items-center justify-between px-6 backdrop-blur-sm transition-colors duration-500"
      style={{
        backgroundColor: `${theme.bg}cc`,
        borderBottom: `1px solid ${theme.accentGlow}`,
      }}
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
              className="w-72 p-0 border-r"
              style={{
                backgroundColor: theme.bg,
                borderColor: theme.accentGlow,
                fontFamily: "var(--font-dm-sans), sans-serif",
              }}
              aria-describedby={undefined}
            >
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <div className="flex h-full flex-col">
                <div
                  className="flex h-14 items-center gap-3 px-4"
                  style={{ borderBottom: `1px solid ${theme.accentGlow}` }}
                >
                  <Image
                    src="/colony-icon.svg"
                    alt="Colony"
                    width={24}
                    height={24}
                    className="h-6 w-6"
                  />
                  <span
                    className="text-sm font-light tracking-[0.2em] uppercase"
                    style={{ color: theme.textMuted }}
                  >
                    Colony
                  </span>
                </div>

                <nav className="flex-1 p-3 space-y-1">
                  {mobileNavItems.map((tab) => (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium"
                      style={{ color: theme.textMuted }}
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

        <Link href="/browse" className="flex items-center gap-2 md:hidden" suppressHydrationWarning>
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

      {/* Center: Browse Tabs */}
      <div className="hidden md:flex items-center gap-1">
        {browseTabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Right: Actions + User */}
      <div className="flex items-center gap-2" suppressHydrationWarning>
        <Button size="sm" className="hidden sm:flex gap-2">
          <Plus className="h-4 w-4" />
          <span>New</span>
        </Button>
        <div className="ml-2 pl-2 border-l border-border" suppressHydrationWarning>
          {mounted && <UserMenu />}
        </div>
      </div>
    </header>
  );
}
