"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/auth/user-menu";
import { cn } from "@/lib/utils";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { Menu, Megaphone, PenTool, Mail, CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const marketingTabs = [
  { label: "Campaigns", href: "/marketing/campaigns", icon: Megaphone },
  { label: "Content", href: "/marketing/content", icon: PenTool },
  { label: "Email", href: "/marketing/email", icon: Mail },
  { label: "Calendar", href: "/marketing/calendar", icon: CalendarDays },
];

const mobileNavItems = [
  { label: "Home", href: "/chat" },
  { label: "Marketing", href: "/marketing" },
  { label: "Browse", href: "/browse" },
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

        <Link href="/marketing" className="flex items-center gap-2 md:hidden" suppressHydrationWarning>
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

      {/* Center: Marketing Tabs */}
      <div className="hidden md:flex items-center gap-1">
        {marketingTabs.map((tab) => {
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
        <Link href="/marketing/campaigns/new">
          <Button size="sm" className="hidden sm:flex gap-2">
            <Plus className="h-4 w-4" />
            <span>New Campaign</span>
          </Button>
        </Link>
        <div className="ml-2 pl-2 border-l border-border" suppressHydrationWarning>
          {mounted && <UserMenu />}
        </div>
      </div>
    </header>
  );
}
