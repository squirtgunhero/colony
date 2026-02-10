"use client";

// ============================================
// COLONY - Browse Mode Layout
// Lists and detail pages for CRM entities; keeps Contacts/Properties/Deals tabs in header
// Uses unified ModeSidebar
// ============================================

import { useEffect } from "react";
import { Toaster } from "sonner";
import { ModeSidebar } from "./ModeSidebar";
import { BrowseTopNav } from "./BrowseTopNav";
import { CommandBar, ChatDrawer } from "@/components/assistant";
import { CRMContextProvider } from "@/lib/context/CRMContext";
import { useModeStore } from "@/lib/mode";

interface BrowseLayoutProps {
  children: React.ReactNode;
}

export function BrowseLayout({ children }: BrowseLayoutProps) {
  const { setMode } = useModeStore();

  useEffect(() => {
    setMode("browse");
  }, [setMode]);

  return (
    <CRMContextProvider>
      <div className="min-h-screen bg-background" suppressHydrationWarning>
        <ModeSidebar />
        <div className="md:pl-14 min-h-screen flex flex-col" suppressHydrationWarning>
          <BrowseTopNav />
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
