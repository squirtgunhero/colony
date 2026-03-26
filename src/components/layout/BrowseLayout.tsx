"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";
import { ModeSidebar } from "./ModeSidebar";
import { BrowseTopNav } from "./BrowseTopNav";
import { ViewToggle } from "@/components/view-mode/ViewToggle";
import { CRMContextProvider } from "@/lib/context/CRMContext";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { useModeStore } from "@/lib/mode";
import { FloatingActionButton } from "@/components/quick-capture/FloatingActionButton";
import { DialerProvider } from "@/components/dialer/DialerProvider";
import { DialerPanel } from "@/components/dialer/DialerPanel";

interface BrowseLayoutProps {
  children: React.ReactNode;
}

export function BrowseLayout({ children }: BrowseLayoutProps) {
  const { setMode, setViewMode } = useModeStore();
  const { theme } = useColonyTheme();

  useEffect(() => {
    setMode("browse");
    setViewMode("classic");
  }, [setMode, setViewMode]);

  return (
    <CRMContextProvider>
      <DialerProvider>
      <div
        className="min-h-screen transition-colors duration-500"
        style={{ backgroundColor: theme.bg, color: theme.text }}
        suppressHydrationWarning
      >
        <ModeSidebar />
        <ViewToggle />
        <div className="md:pl-[208px] min-h-screen flex flex-col" suppressHydrationWarning>
          <BrowseTopNav />
          <main className="flex-1 pb-24" suppressHydrationWarning>
            {children}
          </main>
        </div>
        <FloatingActionButton />
        <DialerPanel />
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast: "bg-card border border-border shadow-lg",
            },
          }}
        />
      </div>
      </DialerProvider>
    </CRMContextProvider>
  );
}
