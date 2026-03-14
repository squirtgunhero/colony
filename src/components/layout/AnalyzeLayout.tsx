"use client";

// HIDDEN: Phase 2 - /analyze not in nav; still accessible via URL and AI ("show me my dashboard")

import { useEffect } from "react";
import { Toaster } from "sonner";
import { ModeSidebar } from "./ModeSidebar";
import { TopNav } from "./top-nav";
import { ViewToggle } from "@/components/view-mode/ViewToggle";
import { CRMContextProvider } from "@/lib/context/CRMContext";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { useModeStore } from "@/lib/mode";

interface AnalyzeLayoutProps {
  children: React.ReactNode;
}

export function AnalyzeLayout({ children }: AnalyzeLayoutProps) {
  const { setMode, setViewMode } = useModeStore();
  const { theme } = useColonyTheme();

  useEffect(() => {
    setMode("analyze");
    setViewMode("classic");
  }, [setMode, setViewMode]);

  return (
    <CRMContextProvider>
      <div
        className="min-h-screen transition-colors duration-500"
        style={{ backgroundColor: theme.bg, color: theme.text }}
        suppressHydrationWarning
      >
        <ModeSidebar />
        <ViewToggle />
        <div className="md:pl-52 min-h-screen flex flex-col" suppressHydrationWarning>
          <TopNav />
          <main className="flex-1" suppressHydrationWarning>
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
    </CRMContextProvider>
  );
}
