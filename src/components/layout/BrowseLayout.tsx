"use client";

// ============================================
// COLONY - Browse Mode Layout
// Lists and detail pages for CRM entities
// Uses the full IconSidebar with all navigation options
// ============================================

import { useEffect } from "react";
import { Toaster } from "sonner";
import { IconSidebar } from "./icon-sidebar";
import { BrowseTopNav } from "./BrowseTopNav";
import { CRMContextProvider } from "@/lib/context/CRMContext";
import { useModeStore } from "@/lib/mode";

interface BrowseLayoutProps {
  children: React.ReactNode;
}

export function BrowseLayout({ children }: BrowseLayoutProps) {
  const { setMode } = useModeStore();
  
  // Ensure mode is set to browse
  useEffect(() => {
    setMode("browse");
  }, [setMode]);

  return (
    <CRMContextProvider>
      <div className="min-h-screen bg-background" suppressHydrationWarning>
        <IconSidebar />
        
        <div className="md:pl-14 min-h-screen flex flex-col" suppressHydrationWarning>
          <BrowseTopNav />
          
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
