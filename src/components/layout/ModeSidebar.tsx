"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/auth/user-menu";
import { TeamSwitcher } from "@/components/team";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import {
  Home,
  Users,
  Handshake,
  Building2,
  Bell,
  CheckSquare,
  Phone,
  BotMessageSquare,
  MessageSquareText,
  Megaphone,
  CalendarDays,
  Inbox,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export function ModeSidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [inboxUnread, setInboxUnread] = useState(0);
  const { theme } = useColonyTheme();

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    fetch("/api/inbox/unread-count")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.count) setInboxUnread(data.count);
      })
      .catch(() => {});
  }, []);

  interface NavSection {
    label?: string;
    items: NavItem[];
  }

  const navSections: NavSection[] = [
    {
      items: [
        { href: "/dashboard", label: "Home", icon: Home },
      ],
    },
    {
      label: "CRM",
      items: [
        { href: "/browse/contacts", label: "People", icon: Users },
        { href: "/browse/deals", label: "Deals", icon: Handshake },
        { href: "/browse/properties", label: "Properties", icon: Building2 },
        { href: "/browse/tasks", label: "Tasks", icon: CheckSquare },
      ],
    },
    {
      label: "Outreach",
      items: [
        { href: "/browse/dialer", label: "Dialer", icon: Phone },
        { href: "/browse/ai-engage", label: "AI Engage", icon: BotMessageSquare },
        { href: "/browse/text-campaigns", label: "Texts", icon: MessageSquareText },
        { href: "/marketing", label: "Marketing", icon: Megaphone },
        { href: "/inbox", label: "Inbox", icon: Inbox, badge: inboxUnread },
      ],
    },
    {
      label: "Insights",
      items: [
        { href: "/browse/listing-alerts", label: "Alerts", icon: Bell },
        { href: "/calendar", label: "Calendar", icon: CalendarDays },
        { href: "/reports", label: "Reports", icon: BarChart3 },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (href === "/chat") return pathname === "/chat" || pathname.startsWith("/chat/");
    if (href === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
    if (href === "/marketing") return pathname.startsWith("/marketing");
    if (href === "/calendar") return pathname.startsWith("/calendar");
    if (href === "/reports") return pathname.startsWith("/reports");
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const taraActive = isActive("/chat");

  return (
    <aside
      className="fixed left-0 top-0 z-50 hidden md:flex h-screen w-[208px] flex-col"
      style={{
        backgroundColor: theme.sidebarBg,
        fontFamily: "var(--font-dm-sans), sans-serif",
      }}
      role="navigation"
      aria-label="Main navigation"
      suppressHydrationWarning
    >
      {/* Logo */}
      <Link
        href="/chat"
        className="flex h-14 items-center gap-2.5 px-5 transition-opacity hover:opacity-80"
        title="Return to Tara"
        aria-label="Colony — Return to Tara"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center">
          <Image
            src="/colony-icon.svg"
            alt="Colony"
            width={22}
            height={22}
            className="h-[22px] w-[22px]"
          />
        </div>
        <span
          className="text-[11px] font-light tracking-[0.2em] uppercase"
          style={{ color: withAlpha(theme.text, 0.25) }}
        >
          Colony
        </span>
      </Link>

      {/* Team Switcher */}
      {mounted && (
        <div
          className="py-2 px-3"
          style={{ borderBottom: `1px solid ${withAlpha(theme.text, 0.05)}` }}
        >
          <TeamSwitcher expanded />
        </div>
      )}

      {/* Navigation */}
      <nav
        className="flex-1 flex flex-col px-3 pt-2 gap-0 overflow-y-auto scrollbar-none"
        suppressHydrationWarning
      >
        {navSections.map((section, si) => (
          <div key={si} className={si > 0 ? "mt-3" : ""}>
            {section.label && (
              <p
                className="text-[10px] font-medium uppercase tracking-[0.08em] px-3 mb-1"
                style={{ color: withAlpha(theme.text, 0.25) }}
              >
                {section.label}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-center gap-2.5 rounded-xl h-9 px-3 relative transition-all duration-150"
                    style={{
                      backgroundColor: active ? withAlpha(theme.text, 0.08) : "transparent",
                    }}
                    aria-current={active ? "page" : undefined}
                    suppressHydrationWarning
                  >
                    <IconComponent
                      className="h-[16px] w-[16px] shrink-0 transition-colors duration-150"
                      style={{
                        color: active ? theme.text : withAlpha(theme.text, 0.30),
                        strokeWidth: 1.5,
                      }}
                    />
                    <span
                      className="text-[13px] tracking-[-0.01em] transition-colors duration-150"
                      style={{
                        color: active ? theme.text : withAlpha(theme.text, 0.45),
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      {item.label}
                    </span>
                    {item.badge != null && item.badge > 0 && (
                      <span
                        className="ml-auto flex items-center justify-center h-[18px] min-w-[18px] px-1.5 rounded-full text-[10px] font-semibold"
                        style={{
                          backgroundColor: withAlpha(theme.accent, 0.15),
                          color: theme.accent,
                        }}
                        aria-label={`${item.badge} unread`}
                      >
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: Settings + Tara + User */}
      <div
        className="flex flex-col gap-1 py-3 px-3"
        style={{ borderTop: `1px solid ${withAlpha(theme.text, 0.05)}` }}
        suppressHydrationWarning
      >
        {(() => {
          const settingsActive = isActive("/settings");
          return (
            <Link
              href="/settings"
              className="flex items-center gap-2.5 rounded-xl h-9 px-3 relative transition-all duration-150"
              style={{
                backgroundColor: settingsActive ? withAlpha(theme.text, 0.08) : "transparent",
              }}
              aria-current={settingsActive ? "page" : undefined}
            >
              <Settings
                className="h-[16px] w-[16px] shrink-0 transition-colors duration-150"
                style={{
                  color: settingsActive ? theme.text : withAlpha(theme.text, 0.35),
                  strokeWidth: 1.5,
                }}
              />
              <span
                className="text-[13px] tracking-[-0.01em]"
                style={{
                  color: settingsActive ? theme.text : withAlpha(theme.text, 0.5),
                  fontWeight: settingsActive ? 600 : 400,
                }}
              >
                Settings
              </span>
            </Link>
          );
        })()}

        <div
          className="flex items-center gap-2 mt-1 pt-2.5 px-0.5"
          style={{ borderTop: `1px solid ${withAlpha(theme.text, 0.05)}` }}
          suppressHydrationWarning
        >
          {/* Tara pill */}
          <Link
            href="/chat"
            className="flex items-center gap-1.5 h-9 px-4 rounded-full transition-all duration-200"
            style={{
              backgroundColor: taraActive
                ? withAlpha(theme.accent, 0.12)
                : withAlpha(theme.text, 0.05),
            }}
            title="Talk to Tara"
            aria-label="Open Tara AI assistant"
          >
            <span
              className="text-[13px] font-medium"
              style={{
                color: taraActive ? theme.accent : withAlpha(theme.text, 0.5),
              }}
            >
              Tara
            </span>
          </Link>

          {/* User avatar */}
          <div className="ml-auto">
            {mounted && <UserMenu size="sm" />}
          </div>
        </div>
      </div>
    </aside>
  );
}
