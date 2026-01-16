"use client";

// ============================================
// COLONY - Chat Mode Layout
// Clean, conversation-first interface
// No dashboard widgets, charts, or KPIs visible
// ============================================

import { useEffect } from "react";
import { Toaster } from "sonner";
import { ModeSidebar } from "./ModeSidebar";
import { ChatTopNav } from "./ChatTopNav";
import { ContextDrawer } from "@/components/chat/ContextDrawer";
import { ChatCommandBar } from "@/components/chat/ChatCommandBar";
import { CRMContextProvider } from "@/lib/context/CRMContext";
import { useModeStore } from "@/lib/mode";

interface ChatLayoutProps {
  children: React.ReactNode;
}

export function ChatLayout({ children }: ChatLayoutProps) {
  const { setMode, drawer } = useModeStore();
  
  // Ensure mode is set to chat
  useEffect(() => {
    setMode("chat");
  }, [setMode]);

  return (
    <CRMContextProvider>
      <div className="min-h-screen bg-background" suppressHydrationWarning>
        {/* Simplified sidebar for Chat Mode */}
        <ModeSidebar />
        
        <div className="md:pl-14 min-h-screen flex flex-col" suppressHydrationWarning>
          {/* Minimal top nav */}
          <ChatTopNav />
          
          {/* Main chat canvas */}
          <main 
            className="flex-1 flex flex-col relative"
            suppressHydrationWarning
          >
            {children}
          </main>
        </div>
        
        {/* Context Drawer - slides in from right */}
        <ContextDrawer />
        
        {/* Command Bar - primary interaction surface */}
        <ChatCommandBar />
        
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
