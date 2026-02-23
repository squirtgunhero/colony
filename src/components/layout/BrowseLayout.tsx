"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";
import { ModeSidebar } from "./ModeSidebar";
import { BrowseTopNav } from "./BrowseTopNav";
import { CRMContextProvider } from "@/lib/context/CRMContext";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { useModeStore } from "@/lib/mode";
import { FloatingActionButton } from "@/components/quick-capture/FloatingActionButton";

interface BrowseLayoutProps {
  children: React.ReactNode;
}

export function BrowseLayout({ children }: BrowseLayoutProps) {
  const { setMode } = useModeStore();
  const { theme } = useColonyTheme();

  useEffect(() => {
    setMode("browse");
  }, [setMode]);

  return (
    <CRMContextProvider>
      <div
        className="min-h-screen transition-colors duration-500"
        style={{ backgroundColor: theme.bg, color: theme.text }}
        suppressHydrationWarning
      >
        <ModeSidebar />
        <div className="md:pl-52 min-h-screen flex flex-col" suppressHydrationWarning>
          <BrowseTopNav />
          <main className="flex-1 pb-24" suppressHydrationWarning>
            {children}
          </main>
        </div>
        <FloatingActionButton />
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast: "bg-card border border-border shadow-lg",
            },
          }}
        />
      </div>
    </CRMContextProvider>
  );
}
