"use client";

// ============================================
// COLONY - Analyze Mode Layout
// Full dashboard with charts, KPIs, and analytics
// Uses the full IconSidebar with all navigation options
// ============================================

import { useEffect } from "react";
import { Toaster } from "sonner";
import { IconSidebar } from "./icon-sidebar";
import { TopNav } from "./top-nav";
import { CRMContextProvider } from "@/lib/context/CRMContext";
import { useModeStore } from "@/lib/mode";

interface AnalyzeLayoutProps {
  children: React.ReactNode;
}

export function AnalyzeLayout({ children }: AnalyzeLayoutProps) {
  const { setMode } = useModeStore();
  
  // Ensure mode is set to analyze
  useEffect(() => {
    setMode("analyze");
  }, [setMode]);

  return (
    <CRMContextProvider>
      <div className="min-h-screen bg-background" suppressHydrationWarning>
        <IconSidebar />
        
        <div className="md:pl-14 min-h-screen flex flex-col" suppressHydrationWarning>
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
