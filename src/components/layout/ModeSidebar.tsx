"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/auth/user-menu";
import { TeamSwitcher } from "@/components/team";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";

interface NavItem {
  href: string;
  label: string;
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

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Home" },
    { href: "/browse/contacts", label: "People" },
    { href: "/browse/deals", label: "Deals" },
    { href: "/browse/properties", label: "Properties" },
    { href: "/browse/tasks", label: "Tasks" },
    { href: "/browse/dialer", label: "Dialer" },
    { href: "/browse/ai-engage", label: "AI Engage" },
    { href: "/browse/text-campaigns", label: "Texts" },
    { href: "/marketing", label: "Marketing" },
    { href: "/calendar", label: "Calendar" },
    { href: "/inbox", label: "Inbox", badge: inboxUnread },
    { href: "/reports", label: "Reports" },
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
  const borderColor = withAlpha(theme.text, 0.06);

  return (
    <aside
      className="fixed left-0 top-0 z-50 hidden md:flex h-screen w-48 flex-col"
      style={{
        backgroundColor: theme.sidebarBg,
        borderRight: `1px solid ${borderColor}`,
        fontFamily: "var(--font-dm-sans), sans-serif",
      }}
      suppressHydrationWarning
    >
      {/* Logo */}
      <Link
        href="/chat"
        className="flex h-13 items-center gap-2.5 px-4 transition-opacity hover:opacity-80"
        style={{ borderBottom: `1px solid ${borderColor}` }}
        title="Return to Tara"
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
          style={{ color: withAlpha(theme.text, 0.3) }}
        >
          Colony
        </span>
      </Link>

      {/* Team Switcher */}
      {mounted && (
        <div className="py-2 px-2.5" style={{ borderBottom: `1px solid ${borderColor}` }}>
          <TeamSwitcher expanded />
        </div>
      )}

      {/* Navigation — one flat list */}
      <nav className="flex flex-col px-2.5 pt-3 gap-0.5" suppressHydrationWarning>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center rounded-md h-9 px-3 relative transition-all duration-150"
              style={{
                backgroundColor: active ? withAlpha(theme.accent, 0.08) : "transparent",
              }}
              suppressHydrationWarning
            >
              {active && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full"
                  style={{ backgroundColor: theme.accent }}
                />
              )}
              <span
                className="text-[14px] tracking-[-0.01em] transition-colors duration-150"
                style={{
                  color: active ? theme.text : withAlpha(theme.text, 0.5),
                  fontWeight: active ? 600 : 450,
                }}
              >
                {item.label}
              </span>
              {item.badge != null && item.badge > 0 && (
                <span
                  className="ml-auto flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-full text-[10px] font-bold"
                  style={{ backgroundColor: withAlpha(theme.accent, 0.2), color: theme.accent }}
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom: Settings + Tara + User */}
      <div
        className="flex flex-col gap-1.5 py-3 px-2.5"
        style={{ borderTop: `1px solid ${borderColor}` }}
        suppressHydrationWarning
      >
        {(() => {
          const settingsActive = isActive("/settings");
          return (
            <Link
              href="/settings"
              className="flex items-center rounded-md h-9 px-3 relative transition-all duration-150"
              style={{
                backgroundColor: settingsActive ? withAlpha(theme.accent, 0.08) : "transparent",
              }}
            >
              {settingsActive && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full"
                  style={{ backgroundColor: theme.accent }}
                />
              )}
              <span
                className="text-[14px] tracking-[-0.01em]"
                style={{
                  color: settingsActive ? theme.text : withAlpha(theme.text, 0.5),
                  fontWeight: settingsActive ? 600 : 450,
                }}
              >
                Settings
              </span>
            </Link>
          );
        })()}

        <div
          className="flex items-center gap-2 mt-1.5 pt-2.5 px-0.5"
          style={{ borderTop: `1px solid ${borderColor}` }}
          suppressHydrationWarning
        >
          {/* Tara pill */}
          <Link
            href="/chat"
            className="flex items-center gap-1.5 h-9 px-4 rounded-full transition-all duration-200"
            style={{
              backgroundColor: taraActive
                ? withAlpha(theme.accent, 0.15)
                : withAlpha(theme.text, 0.05),
              border: `1px solid ${taraActive ? withAlpha(theme.accent, 0.3) : withAlpha(theme.text, 0.08)}`,
            }}
            title="Talk to Tara"
          >
            <span
              className="text-[13px] font-medium tracking-wide"
              style={{
                fontFamily: "'Spectral', serif",
                color: taraActive ? theme.accent : withAlpha(theme.text, 0.55),
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
