"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { QuickCaptureSheet } from "./QuickCaptureSheet";

const HIDDEN_PATHS = ["/chat", "/"];

export function FloatingActionButton() {
  const pathname = usePathname();
  const { theme } = useColonyTheme();
  const [open, setOpen] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        // Don't trigger when typing in inputs/textareas
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

        e.preventDefault();
        setOpen(true);
      }
    },
    []
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (HIDDEN_PATHS.includes(pathname)) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 md:bottom-6 md:right-6"
        style={{
          backgroundColor: theme.accent,
          color: "#fff",
          boxShadow: `0 2px 10px rgba(0,0,0,0.2)`,
        }}
        aria-label="Quick capture (⌘N)"
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} />
      </button>
      <QuickCaptureSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
