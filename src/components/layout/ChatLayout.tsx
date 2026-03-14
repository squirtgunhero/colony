"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";
import { ContextDrawer } from "@/components/chat/ContextDrawer";
import { ChatCommandBar } from "@/components/chat/ChatCommandBar";
import { ViewToggle } from "@/components/view-mode/ViewToggle";
import { CRMContextProvider } from "@/lib/context/CRMContext";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { useModeStore } from "@/lib/mode";

interface ChatLayoutProps {
  children: React.ReactNode;
}

export function ChatLayout({ children }: ChatLayoutProps) {
  const { setMode, setViewMode } = useModeStore();
  const { theme } = useColonyTheme();

  useEffect(() => {
    setMode("chat");
    setViewMode("chat");
  }, [setMode, setViewMode]);

  return (
    <CRMContextProvider>
      <div
        className="min-h-screen transition-colors duration-500"
        style={{ backgroundColor: theme.bg }}
        suppressHydrationWarning
      >
        {/* Zero chrome — no sidebar, no top nav */}
        <ViewToggle />

        <main
          className="min-h-screen flex flex-col relative"
          suppressHydrationWarning
        >
          {children}
        </main>

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
  );
}
