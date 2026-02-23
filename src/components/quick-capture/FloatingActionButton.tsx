"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { QuickCaptureSheet } from "./QuickCaptureSheet";

const HIDDEN_PATHS = ["/chat", "/"];

export function FloatingActionButton() {
  const pathname = usePathname();
  const { theme } = useColonyTheme();
  const [open, setOpen] = useState(false);

  if (HIDDEN_PATHS.includes(pathname)) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          backgroundColor: theme.accent,
          color: "#fff",
          boxShadow: `0 4px 14px rgba(0,0,0,0.25), 0 0 20px ${theme.accent}33`,
        }}
        aria-label="Quick capture"
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} />
      </button>
      <QuickCaptureSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
