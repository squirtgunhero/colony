"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Megaphone,
  Palette,
  Target,
  Search,
  Globe,
  BarChart3,
  CreditCard,
  Settings,
  Hexagon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, href: "/honeycomb", label: "Dashboard" },
  { icon: MessageSquare, href: "/honeycomb/chat-studio", label: "Chat Studio" },
  { icon: Megaphone, href: "/honeycomb/campaigns", label: "Campaigns" },
  { icon: Palette, href: "/honeycomb/creatives", label: "Creatives" },
  { icon: Target, href: "/honeycomb/targeting", label: "Targeting" },
  { icon: Search, href: "/honeycomb/keyword-planner", label: "Keyword Planner" },
  { icon: Globe, href: "/honeycomb/publishers", label: "Publishers" },
  { icon: BarChart3, href: "/honeycomb/analytics", label: "Analytics" },
  { icon: CreditCard, href: "/honeycomb/billing", label: "Billing" },
  { icon: Settings, href: "/honeycomb/settings", label: "Settings" },
];

export function HoneycombSidebar() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!mounted) {
    return (
      <aside className="fixed left-0 top-0 z-50 hidden md:flex h-screen w-14 flex-col bg-[#0a0a0a] border-r border-[#1f1f1f]" />
    );
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 hidden md:flex h-screen flex-col transition-all duration-200 ease-out",
        "bg-[#0a0a0a] border-r border-[#1f1f1f]",
        isExpanded ? "w-56" : "w-14"
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-3 border-b border-[#1f1f1f] px-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center">
          <Hexagon className="h-6 w-6 text-amber-500 fill-amber-500/20" />
        </div>
        <span
          className={cn(
            "font-semibold text-sm text-white tracking-wide whitespace-nowrap transition-all duration-200",
            isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
          )}
        >
          Honeycomb
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-0.5 py-3 px-2">
        {navItems.map((item) => {
          // Exact match for dashboard, startsWith for nested routes
          const isActive =
            item.href === "/honeycomb"
              ? pathname === "/honeycomb"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg transition-all duration-150",
                isExpanded ? "h-9 px-2.5" : "h-9 w-10 justify-center",
                isActive
                  ? "bg-amber-500/10 text-amber-500"
                  : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
              )}
            >
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  isActive && "text-amber-500"
                )}
              />
              <span
                className={cn(
                  "text-sm whitespace-nowrap transition-all duration-200",
                  isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Back to Colony CRM */}
      <div className="border-t border-[#1f1f1f] py-3 px-2">
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-3 rounded-lg transition-colors text-neutral-500 hover:bg-white/5 hover:text-neutral-300",
            isExpanded ? "h-9 px-2.5" : "h-9 w-10 justify-center"
          )}
        >
          <svg
            className="h-[18px] w-[18px] shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span
            className={cn(
              "text-sm whitespace-nowrap transition-all duration-200",
              isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
            )}
          >
            Back to CRM
          </span>
        </Link>
      </div>
    </aside>
  );
}

