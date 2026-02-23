"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/auth/user-menu";
import { TeamSwitcher } from "@/components/team";
import {
  Home,
  Layers,
  Share2,
  Inbox,
  Bell,
  Settings,
} from "lucide-react";
import { useColonyTheme } from "@/lib/chat-theme-context";

const topNavItems = [
  { icon: Home, href: "/chat", label: "Home", description: "AI-first interface" },
  { icon: Layers, href: "/browse", label: "Browse", description: "Contacts, properties, deals" },
  { icon: Share2, href: "/referrals", label: "Referrals", description: "Lead sharing" },
  { icon: Inbox, href: "/inbox", label: "Inbox", description: "Messages" },
];

const bottomNavItems = [
  { icon: Bell, href: "/notifications", label: "Notifications" },
  { icon: Settings, href: "/settings", label: "Settings" },
];

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

  const isActive = (href: string) => {
    if (href === "/chat") return pathname === "/chat" || pathname.startsWith("/chat/");
    if (href === "/browse") return pathname.startsWith("/browse");
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const borderColor = theme.accentSoft;

  return (
    <aside
      className="fixed left-0 top-0 z-50 hidden md:flex h-screen w-52 flex-col"
      style={{
        backgroundColor: theme.sidebarBg,
        borderRight: `1px solid ${borderColor}`,
        fontFamily: "var(--font-dm-sans), sans-serif",
      }}
      suppressHydrationWarning
    >
      {/* Logo */}
      <div
        className="flex h-14 items-center gap-3 px-3"
        style={{ borderBottom: `1px solid ${borderColor}` }}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center">
          <Image
            src="/colony-icon.svg"
            alt="Colony"
            width={24}
            height={24}
            className="h-6 w-6"
          />
        </div>
        <span
          className="text-sm font-light tracking-[0.2em] uppercase whitespace-nowrap"
          style={{ color: theme.text, opacity: 0.5 }}
        >
          Colony
        </span>
      </div>

      {/* Team Switcher */}
      {mounted && (
        <div className="py-2 px-2" style={{ borderBottom: `1px solid ${borderColor}` }}>
          <TeamSwitcher expanded />
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex flex-1 flex-col gap-1 py-3 px-2" suppressHydrationWarning>
        {topNavItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 rounded-lg h-10 px-2.5 relative transition-colors duration-150"
              style={{ color: active ? theme.text : theme.textMuted }}
              suppressHydrationWarning
            >
              <item.icon
                className="h-[18px] w-[18px] shrink-0"
                style={{ color: active ? theme.accent : theme.textMuted }}
              />
              <div className="flex flex-col min-w-0 flex-1">
                <span
                  className="text-sm whitespace-nowrap"
                  style={{ color: active ? theme.text : theme.text, opacity: active ? 1 : 0.5 }}
                >
                  {item.label}
                </span>
                {item.description && (
                  <span
                    className="text-[10px] whitespace-nowrap"
                    style={{ color: theme.text, opacity: 0.35 }}
                  >
                    {item.description}
                  </span>
                )}
              </div>
              {item.label === "Inbox" && inboxUnread > 0 && (
                <span
                  className="flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-bold"
                  style={{ backgroundColor: theme.accent, color: "#fff" }}
                >
                  {inboxUnread > 99 ? "99+" : inboxUnread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="flex flex-col gap-1 py-3 px-2" style={{ borderTop: `1px solid ${borderColor}` }} suppressHydrationWarning>
        {bottomNavItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 rounded-lg h-9 px-2.5 transition-colors duration-150"
              style={{ color: active ? theme.text : theme.textMuted }}
              suppressHydrationWarning
            >
              <item.icon
                className="h-[18px] w-[18px] shrink-0"
                style={{ color: active ? theme.accent : theme.textMuted }}
              />
              <span
                className="text-sm whitespace-nowrap"
                style={{ color: theme.text, opacity: active ? 1 : 0.5 }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* User Avatar */}
        <div
          className="flex items-center gap-3 mt-2 pt-2 px-2.5"
          style={{ borderTop: `1px solid ${borderColor}` }}
          suppressHydrationWarning
        >
          {mounted && <UserMenu size="sm" />}
          <span className="text-sm whitespace-nowrap" style={{ color: theme.textMuted }}>
            Account
          </span>
        </div>
      </div>
    </aside>
  );
}
