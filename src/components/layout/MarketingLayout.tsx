"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";
import { ModeSidebar } from "./ModeSidebar";
import { MarketingTopNav } from "./MarketingTopNav";
import { ViewToggle } from "@/components/view-mode/ViewToggle";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { useModeStore } from "@/lib/mode";

interface MarketingLayoutProps {
  children: React.ReactNode;
}

export function MarketingLayout({ children }: MarketingLayoutProps) {
  const { setMode, setViewMode } = useModeStore();
  const { theme } = useColonyTheme();

  useEffect(() => {
    setMode("browse");
    setViewMode("classic");
  }, [setMode, setViewMode]);

  return (
    <div
      className="min-h-screen transition-colors duration-500"
      style={{ backgroundColor: theme.bg, color: theme.text }}
      suppressHydrationWarning
    >
      <ModeSidebar />
      <ViewToggle />
      <div className="md:pl-[208px] min-h-screen flex flex-col" suppressHydrationWarning>
        <MarketingTopNav />
        <main className="flex-1 pb-24" suppressHydrationWarning>
          {children}
        </main>
      </div>
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
