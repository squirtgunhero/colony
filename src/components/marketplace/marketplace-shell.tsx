"use client";

import { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { Toaster } from "sonner";

interface MarketplaceShellProps {
  children: ReactNode;
  isLoggedIn: boolean;
}

export function MarketplaceShell({ children, isLoggedIn }: MarketplaceShellProps) {
  const { theme } = useColonyTheme();

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: theme.bg, color: theme.text }}
    >
      <header
        className="sticky top-0 z-50 backdrop-blur-xl"
        style={{
          backgroundColor: withAlpha(theme.bg, 0.9),
          borderBottom: `1px solid ${withAlpha(theme.text, 0.06)}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/marketplace" className="flex items-center gap-3">
            <Image
              src="/colony-icon.svg"
              alt="Colony"
              width={24}
              height={24}
              className="h-6 w-6"
            />
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-light tracking-[0.2em] uppercase"
                style={{ color: theme.text, opacity: 0.5 }}
              >
                Colony
              </span>
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: withAlpha(theme.accent, 0.15),
                  color: theme.accent,
                }}
              >
                Marketplace
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <Link
                  href="/chat"
                  className="text-sm px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                  style={{ color: theme.textMuted }}
                >
                  Dashboard
                </Link>
                <Link
                  href="/referrals"
                  className="text-sm px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                  style={{ color: theme.textMuted }}
                >
                  My Referrals
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="text-sm px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                  style={{ color: theme.textMuted }}
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="text-sm px-4 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: theme.accent,
                    color: "#fff",
                  }}
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: "bg-card border border-border shadow-lg",
          },
        }}
      />
    </div>
  );
}
