"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";
import { ModeSidebar } from "./ModeSidebar";
import { ChatTopNav } from "./ChatTopNav";
import { ContextDrawer } from "@/components/chat/ContextDrawer";
import { ChatCommandBar } from "@/components/chat/ChatCommandBar";
import { CRMContextProvider } from "@/lib/context/CRMContext";
import { ChatThemeProvider } from "@/lib/chat-theme-context";
import { useModeStore } from "@/lib/mode";

interface ChatLayoutProps {
  children: React.ReactNode;
}

export function ChatLayout({ children }: ChatLayoutProps) {
  const { setMode, drawer } = useModeStore();

  useEffect(() => {
    setMode("chat");
  }, [setMode]);

  return (
    <ChatThemeProvider>
      <CRMContextProvider>
        <div className="min-h-screen" suppressHydrationWarning>
          <ModeSidebar />

          <div className="md:pl-14 min-h-screen flex flex-col" suppressHydrationWarning>
            <ChatTopNav />

            <main
              className="flex-1 flex flex-col relative"
              suppressHydrationWarning
            >
              {children}
            </main>
          </div>

          <ContextDrawer />
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
    </ChatThemeProvider>
  );
}
