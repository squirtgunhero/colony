// Dashboard Layout - Uses unified ModeSidebar (same nav as Chat/Browse)
import { ModeSidebar } from "@/components/layout/ModeSidebar";
import { TopNav } from "@/components/layout/top-nav";
import { CommandBar, ChatDrawer } from "@/components/assistant";
import { CRMContextProvider } from "@/lib/context/CRMContext";
import { Toaster } from "sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

        {/* AI Assistant - persists on all pages */}
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
