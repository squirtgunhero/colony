"use client";

import { ModeSidebar } from "@/components/layout/ModeSidebar";
import { TopNav } from "@/components/layout/top-nav";
import { CRMContextProvider } from "@/lib/context/CRMContext";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { Toaster } from "sonner";
import { FloatingActionButton } from "@/components/quick-capture/FloatingActionButton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme } = useColonyTheme();

  return (
    <CRMContextProvider>
      <div
        className="min-h-screen transition-colors duration-500"
        style={{ backgroundColor: theme.bg, color: theme.text }}
        suppressHydrationWarning
      >
        <ModeSidebar />
        <div className="md:pl-52 min-h-screen flex flex-col" suppressHydrationWarning>
          <TopNav />
          <main className="flex-1" suppressHydrationWarning>
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
