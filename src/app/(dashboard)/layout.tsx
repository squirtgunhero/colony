import { IconSidebar } from "@/components/layout/icon-sidebar";
import { TopNav } from "@/components/layout/top-nav";
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
