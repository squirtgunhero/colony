"use client";

// ============================================
// COLONY - Analyze Mode Layout
// HIDDEN: Phase 2 - /analyze not in nav; still accessible via URL and AI ("show me my dashboard")
// Uses unified ModeSidebar
// ============================================

import { useEffect } from "react";
import { Toaster } from "sonner";
import { ModeSidebar } from "./ModeSidebar";
import { TopNav } from "./top-nav";
import { CommandBar, ChatDrawer } from "@/components/assistant";
import { CRMContextProvider } from "@/lib/context/CRMContext";
import { useModeStore } from "@/lib/mode";

interface AnalyzeLayoutProps {
  children: React.ReactNode;
}

export function AnalyzeLayout({ children }: AnalyzeLayoutProps) {
  const { setMode } = useModeStore();

  useEffect(() => {
    setMode("analyze");
  }, [setMode]);

  return (
    <CRMContextProvider>
      <div className="min-h-screen bg-background" suppressHydrationWarning>
        <ModeSidebar />
        <div className="md:pl-14 min-h-screen flex flex-col" suppressHydrationWarning>
          <TopNav />
          <main className="flex-1 pb-24" suppressHydrationWarning>
            {children}
          </main>
        </div>
        <ChatDrawer />
        <CommandBar />
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
