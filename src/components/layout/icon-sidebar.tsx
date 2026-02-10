"use client";

// HIDDEN: Phase 2 - Replaced by unified ModeSidebar. Kept for reference; not used in any layout.

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/auth/user-menu";
import { TeamSwitcher } from "@/components/team";
import {
  LayoutDashboard,
  UserCircle2,
  MapPin,
  Target,
  PieChart,
  Download,
  Bell,
  Settings,
  Inbox,
  Share2,
  Hexagon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const topNavItems = [
  { icon: LayoutDashboard, href: "/dashboard", label: "Dashboard" },
  { icon: Share2, href: "/referrals", label: "Referrals" },
  { icon: Inbox, href: "/inbox", label: "Inbox" },
  { icon: UserCircle2, href: "/contacts", label: "Contacts" },
  { icon: MapPin, href: "/properties", label: "Properties" },
  { icon: Target, href: "/deals", label: "Deals" },
  { icon: Hexagon, href: "/honeycomb", label: "Honeycomb" },
  { icon: PieChart, href: "/reports", label: "Reports" },
  { icon: Download, href: "/export", label: "Export" },
];

const bottomNavItems = [
  { icon: Bell, href: "/notifications", label: "Notifications" },
  { icon: Settings, href: "/settings", label: "Settings" },
];

export function IconSidebar() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 z-50 hidden md:flex h-screen flex-col transition-all duration-200 ease-out",
        "bg-neutral-950 border-r border-neutral-800",
        isExpanded ? "w-52" : "w-14"
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      suppressHydrationWarning
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-3 border-b border-neutral-800 px-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center">
          <Image
            src="/colony-icon.svg"
            alt="Colony"
            width={24}
            height={24}
            className="h-6 w-6"
          />
        </div>
        <span className={cn(
          "font-[family-name:var(--font-geist)] text-sm font-light text-neutral-100 tracking-[0.2em] uppercase whitespace-nowrap transition-all duration-200",
          isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
        )}>
          Colony
        </span>
      </div>

      {/* Team Switcher */}
      {mounted && (
        <div className="border-b border-neutral-800 py-2 px-2">
          <TeamSwitcher expanded={isExpanded} />
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex flex-1 flex-col gap-1 py-3 px-2" suppressHydrationWarning>
        
        {topNavItems.map((item) => {
          const isActive = item.href !== "#" && (pathname === item.href || pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg transition-colors",
                isExpanded ? "h-9 px-2.5" : "h-9 w-10 justify-center",
                isActive
                  ? "bg-neutral-800 text-neutral-100"
                  : "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200"
              )}
              suppressHydrationWarning
            >
              <item.icon className={cn(
                "h-[18px] w-[18px] shrink-0",
                isActive && "text-primary"
              )} />
              <span className={cn(
                "text-sm whitespace-nowrap transition-all duration-200",
                isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="flex flex-col gap-1 border-t border-neutral-800 py-3 px-2" suppressHydrationWarning>
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg transition-colors",
                isExpanded ? "h-9 px-2.5" : "h-9 w-10 justify-center",
                isActive
                  ? "bg-neutral-800 text-neutral-100"
                  : "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200"
              )}
              suppressHydrationWarning
            >
              <item.icon className={cn(
                "h-[18px] w-[18px] shrink-0",
                isActive && "text-primary"
              )} />
              <span className={cn(
                "text-sm whitespace-nowrap transition-all duration-200",
                isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* User Avatar */}
        <div 
          className={cn(
            "flex items-center gap-3 mt-2 pt-2 border-t border-neutral-800",
            isExpanded ? "px-2.5" : "justify-center px-0"
          )}
          suppressHydrationWarning
        >
          {mounted && <UserMenu size="sm" />}
          {isExpanded && (
            <span className="text-sm text-neutral-400 whitespace-nowrap">
              Account
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
