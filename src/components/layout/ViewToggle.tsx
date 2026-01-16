"use client";

// ============================================
// COLONY - View Toggle Component
// Switch between Chat Mode and Dashboard Mode
// ============================================

import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { MessageSquare, LayoutDashboard } from "lucide-react";

interface ViewToggleProps {
  className?: string;
}

export function ViewToggle({ className }: ViewToggleProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  const isChatMode = pathname.startsWith("/chat");
  const isAnalyzeMode = pathname.startsWith("/analyze") || pathname.startsWith("/dashboard");

  const handleToggle = (mode: "chat" | "dashboard") => {
    if (mode === "chat") {
      router.push("/chat");
    } else {
      router.push("/analyze");
    }
  };

  return (
    <div 
      className={cn(
        "flex items-center p-1 rounded-full bg-muted/50 border border-border/50",
        className
      )}
    >
      <button
        onClick={() => handleToggle("chat")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
          isChatMode
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        <span>Chat</span>
      </button>
      <button
        onClick={() => handleToggle("dashboard")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
          isAnalyzeMode
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        <LayoutDashboard className="h-3.5 w-3.5" />
        <span>Dashboard</span>
      </button>
    </div>
  );
}
