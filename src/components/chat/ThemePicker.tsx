"use client";

import { useState, useRef, useEffect } from "react";
import { Palette } from "lucide-react";
import { THEMES } from "@/lib/themes";
import { useColonyTheme } from "@/lib/chat-theme-context";

export function ThemePicker() {
  const [open, setOpen] = useState(false);
  const { themeId, setThemeById, theme } = useColonyTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300"
        style={{
          color: theme.textMuted,
          backgroundColor: open ? theme.surface : "transparent",
        }}
        aria-label="Change theme"
      >
        <Palette className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 flex gap-2 p-2.5 rounded-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            backgroundColor: theme.surface,
            border: `1px solid ${theme.accentSoft}`,
            backdropFilter: "blur(12px)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          }}
        >
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setThemeById(t.id);
                setOpen(false);
              }}
              className="group relative w-7 h-7 rounded-full transition-transform duration-300 hover:scale-110"
              style={{
                backgroundColor: t.accent,
                boxShadow:
                  themeId === t.id
                    ? `0 0 0 2px ${t.bg}, 0 0 0 4px ${t.accent}`
                    : "none",
              }}
              aria-label={`Switch to ${t.name} theme`}
              title={t.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
