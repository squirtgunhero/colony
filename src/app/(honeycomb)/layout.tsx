import { HoneycombSidebar } from "@/components/honeycomb/honeycomb-sidebar";
import { Toaster } from "sonner";

export default function HoneycombLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0c0c0c]" suppressHydrationWarning>
      <HoneycombSidebar />
      <div className="md:pl-14 min-h-screen flex flex-col" suppressHydrationWarning>
        <main className="flex-1" suppressHydrationWarning>
          {children}
        </main>
      </div>
      
      <Toaster 
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: "bg-[#161616] border border-[#2a2a2a] shadow-lg text-white",
          },
        }}
      />
    </div>
  );
}

