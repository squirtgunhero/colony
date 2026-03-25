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

  const topItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard" },
  ];

  const crmItems: NavItem[] = [
    { href: "/browse/contacts", label: "Contacts" },
    { href: "/browse/companies", label: "Companies" },
    { href: "/browse/deals", label: "Deals" },
    { href: "/browse/properties", label: "Properties" },
    { href: "/browse/tasks", label: "Tasks" },
  ];

  const otherItems: NavItem[] = [
    { href: "/marketing", label: "Marketing" },
    { href: "/inbox", label: "Inbox", badge: inboxUnread },
  ];

  const isActive = (href: string) => {
    if (href === "/chat") return pathname === "/chat" || pathname.startsWith("/chat/");
    if (href === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
    if (href === "/marketing") return pathname.startsWith("/marketing");
    if (href === "/browse") return pathname.startsWith("/browse");
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const taraActive = isActive("/chat");
  const borderColor = withAlpha(theme.text, 0.06);

  function NavLink({ item }: { item: NavItem }) {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className="group flex items-center rounded-lg h-8 px-2.5 relative transition-all duration-150"
        style={{
          backgroundColor: active ? withAlpha(theme.accent, 0.08) : "transparent",
        }}
        suppressHydrationWarning
      >
        {active && (
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-3.5 rounded-r-full"
            style={{ backgroundColor: theme.accent }}
          />
        )}
        <span
          className="text-[13px] transition-colors duration-150"
          style={{
            color: active ? theme.text : withAlpha(theme.text, 0.45),
            fontWeight: active ? 500 : 400,
          }}
        >
          {item.label}
        </span>
        {item.badge != null && item.badge > 0 && (
          <span
            className="ml-auto flex items-center justify-center h-[16px] min-w-[16px] px-1 rounded-full text-[9px] font-semibold"
            style={{ backgroundColor: withAlpha(theme.accent, 0.2), color: theme.accent }}
          >
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        )}
      </Link>
    );
  }

  return (
    <aside
      className="fixed left-0 top-0 z-50 hidden md:flex h-screen w-44 flex-col"
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
        className="flex h-12 items-center gap-2.5 px-3 transition-opacity hover:opacity-80"
        style={{ borderBottom: `1px solid ${borderColor}` }}
        title="Return to Tara"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center">
          <Image
            src="/colony-icon.svg"
            alt="Colony"
            width={20}
            height={20}
            className="h-5 w-5"
          />
        </div>
        <span
          className="text-[11px] font-light tracking-[0.18em] uppercase"
          style={{ color: withAlpha(theme.text, 0.35) }}
        >
          Colony
        </span>
      </Link>

      {/* Team Switcher */}
      {mounted && (
        <div className="py-1.5 px-2" style={{ borderBottom: `1px solid ${borderColor}` }}>
          <TeamSwitcher expanded />
        </div>
      )}

      {/* Dashboard */}
      <nav className="flex flex-col px-2 pt-3 pb-1 gap-px" suppressHydrationWarning>
        {topItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-3 my-1" style={{ borderBottom: `1px solid ${borderColor}` }} />

      {/* CRM Navigation */}
      <nav className="flex flex-col px-2 py-1 gap-px" suppressHydrationWarning>
        {crmItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-3 my-1" style={{ borderBottom: `1px solid ${borderColor}` }} />

      {/* Other */}
      <nav className="flex flex-col px-2 py-1 gap-px" suppressHydrationWarning>
        {otherItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom: Tara pill + Settings + User */}
      <div
        className="flex flex-col gap-1.5 py-2.5 px-2"
        style={{ borderTop: `1px solid ${borderColor}` }}
        suppressHydrationWarning
      >
        <NavLink item={{ href: "/settings", label: "Settings" }} />

        <div
          className="flex items-center gap-2 mt-1 pt-2 px-0.5"
          style={{ borderTop: `1px solid ${borderColor}` }}
          suppressHydrationWarning
        >
          {/* Tara pill */}
          <Link
            href="/chat"
            className="flex items-center gap-1.5 h-8 px-3 rounded-full transition-all duration-200"
            style={{
              backgroundColor: taraActive
                ? withAlpha(theme.accent, 0.15)
                : withAlpha(theme.text, 0.05),
              border: `1px solid ${taraActive ? withAlpha(theme.accent, 0.25) : withAlpha(theme.text, 0.08)}`,
            }}
            title="Talk to Tara"
          >
            <span
              className="text-[12px] font-medium tracking-wide"
              style={{
                fontFamily: "'Spectral', serif",
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
