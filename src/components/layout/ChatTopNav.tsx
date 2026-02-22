"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { UserMenu } from "@/components/auth/user-menu";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useChatTheme } from "@/lib/chat-theme-context";
import { useAssistantStore } from "@/lib/assistant/store";
import { WaveformVisualizer, type WaveformState } from "@/components/chat/WaveformVisualizer";
import { ThemePicker } from "@/components/chat/ThemePicker";

const mobileNavItems = [
  { label: "Home", href: "/chat" },
  { label: "Browse", href: "/browse" },
  { label: "Referrals", href: "/referrals" },
  { label: "Inbox", href: "/inbox" },
  { label: "Settings", href: "/settings" },
];

export function ChatTopNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme } = useChatTheme();
  const { messages, isLoading, isListening } = useAssistantStore();

  const hasMessages = messages.length > 0;

  const waveformState: WaveformState = isListening
    ? "listening"
    : isLoading
      ? "thinking"
      : "idle";

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
      {/* Left: Mobile Menu */}
      <div className="flex items-center gap-4" suppressHydrationWarning>
        {mounted ? (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 md:hidden"
                style={{ color: theme.textMuted }}
              >
                <Menu className="h-4 w-4" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-72 p-0 border-r text-neutral-100 [&>button]:text-neutral-400 [&>button]:hover:text-neutral-100"
              style={{
                backgroundColor: theme.bg,
                borderColor: theme.accentGlow,
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
                      className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
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

        <Link
          href="/chat"
          className="flex items-center gap-2 md:hidden"
          suppressHydrationWarning
        >
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

      {/* Center: COLONY text + mini waveform */}
      <div className="flex items-center gap-3">
        <span
          className="text-[12px] uppercase tracking-[0.25em] font-light"
          style={{ color: theme.textMuted }}
        >
          Colony
        </span>
        {hasMessages && (
          <div className="animate-in fade-in duration-500">
            <WaveformVisualizer state={waveformState} mini />
          </div>
        )}
      </div>

      {/* Right: Theme picker + User */}
      <div className="flex items-center gap-2" suppressHydrationWarning>
        <ThemePicker />
        {mounted && <UserMenu />}
      </div>
    </header>
  );
}
