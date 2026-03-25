"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/auth/user-menu";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const marketingTabs = [
  { label: "Campaigns", href: "/marketing/campaigns" },
  { label: "Content", href: "/marketing/content" },
  { label: "Email", href: "/marketing/email" },
  { label: "Calendar", href: "/marketing/calendar" },
];

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

export function MarketingTopNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme } = useColonyTheme();

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const borderColor = withAlpha(theme.text, 0.06);

  return (
    <header
      className="sticky top-0 z-40 h-12 flex items-center gap-4 px-5 backdrop-blur-sm transition-colors duration-500"
      style={{
        backgroundColor: `${theme.bg}ee`,
        borderBottom: `1px solid ${borderColor}`,
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
                borderColor,
                fontFamily: "var(--font-dm-sans), sans-serif",
              }}
              aria-describedby={undefined}
            >
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <div className="flex h-full flex-col">
                <div
                  className="flex h-12 items-center gap-2.5 px-4"
                  style={{ borderBottom: `1px solid ${borderColor}` }}
                >
                  <Image src="/colony-icon.svg" alt="Colony" width={20} height={20} className="h-5 w-5" />
                  <span
                    className="text-[11px] font-light tracking-[0.18em] uppercase"
                    style={{ color: withAlpha(theme.text, 0.35) }}
                  >
                    Colony
                  </span>
                </div>

                <nav className="flex-1 p-2.5 space-y-px">
                  {mobileNavItems.map((tab) => {
                    const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
                    return (
                      <Link
                        key={tab.href}
                        href={tab.href}
                        onClick={() => setOpen(false)}
                        className="flex items-center h-9 px-3 rounded-lg text-[13px] transition-colors"
                        style={{
                          backgroundColor: isActive ? withAlpha(theme.accent, 0.08) : "transparent",
                          color: isActive ? theme.text : withAlpha(theme.text, 0.5),
                          fontWeight: isActive ? 500 : 400,
                        }}
                      >
                        {tab.label}
                      </Link>
                    );
                  })}
                </nav>

                {/* Mobile Tara pill */}
                <div className="p-3" style={{ borderTop: `1px solid ${borderColor}` }}>
                  <Link
                    href="/chat"
                    className="flex items-center justify-center h-9 rounded-full transition-colors"
                    style={{
                      backgroundColor: withAlpha(theme.accent, 0.12),
                      border: `1px solid ${withAlpha(theme.accent, 0.2)}`,
                    }}
                    onClick={() => setOpen(false)}
                  >
                    <span
                      className="text-[13px] font-medium tracking-wide"
                      style={{ fontFamily: "'Spectral', serif", color: theme.accent }}
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

      {/* Desktop: Marketing sub-tabs */}
      <div className="hidden md:flex items-center gap-0.5">
        {marketingTabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex items-center h-7 px-3 rounded-md text-[12px] transition-colors"
              style={{
                backgroundColor: isActive ? withAlpha(theme.accent, 0.08) : "transparent",
                color: isActive ? theme.text : withAlpha(theme.text, 0.4),
                fontWeight: isActive ? 500 : 400,
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <div className="flex-1" />

      {/* Quick action */}
      <Link href="/marketing/campaigns/new">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 hidden sm:flex"
          title="New campaign"
        >
          <Plus className="h-3.5 w-3.5" style={{ color: withAlpha(theme.text, 0.4) }} />
        </Button>
      </Link>

      {/* Mobile-only user menu */}
      <div className="md:hidden" suppressHydrationWarning>
        {mounted && <UserMenu size="sm" />}
      </div>
    </header>
  );
}
