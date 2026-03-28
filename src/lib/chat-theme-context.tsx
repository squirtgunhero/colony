"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useTheme } from "@/components/theme-provider";
import {
  type ColonyTheme,
  getThemeForMode,
  getStoredThemeId,
  storeThemeId,
  DEFAULT_THEME_ID,
} from "./themes";

interface ColonyThemeContextValue {
  theme: ColonyTheme;
  themeId: string;
  setThemeById: (id: string) => void;
}

const ColonyThemeContext = createContext<ColonyThemeContextValue | null>(null);

export function ColonyThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState(DEFAULT_THEME_ID);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setThemeIdState(getStoredThemeId());
  }, []);

  const setThemeById = useCallback((id: string) => {
    setThemeIdState(id);
    storeThemeId(id);
    fetch("/api/chat/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: id }),
    }).catch(() => {});
  }, []);

  const isDark = resolvedTheme === "dark";
  const theme = getThemeForMode(isDark);

  useEffect(() => {
    const root = document.documentElement;

    root.style.setProperty("--colony-bg", theme.bg);
    root.style.setProperty("--colony-accent", theme.accent);
    root.style.setProperty("--colony-text", theme.text);
    root.style.setProperty("--colony-bg-glow", theme.bgGlow);
    root.style.setProperty("--colony-surface", theme.surface);
    root.style.setProperty("--colony-text-muted", theme.textMuted);
    root.style.setProperty("--colony-text-soft", theme.textSoft);
    root.style.setProperty("--colony-accent-soft", theme.accentSoft);
    root.style.setProperty("--colony-accent-glow", theme.accentGlow);
    root.style.setProperty("--colony-user-bubble", theme.userBubble);

    root.style.setProperty("--background", theme.bg);
    root.style.setProperty("--foreground", theme.text);
    root.style.setProperty("--card", theme.cardBg);
    root.style.setProperty("--card-foreground", theme.text);
    root.style.setProperty("--popover", theme.cardBg);
    root.style.setProperty("--popover-foreground", theme.text);
    root.style.setProperty("--primary", theme.accent);
    root.style.setProperty("--primary-foreground", isDark ? theme.bg : "#ffffff");
    root.style.setProperty("--muted", theme.surface);
    root.style.setProperty("--muted-foreground", theme.textMuted);
    root.style.setProperty("--accent", theme.accentSoft);
    root.style.setProperty("--accent-foreground", theme.accent);
    root.style.setProperty("--border", isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)");
    root.style.setProperty("--input", isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)");
    root.style.setProperty("--ring", theme.accent);
    root.style.setProperty("--secondary", theme.surface);
    root.style.setProperty("--secondary-foreground", theme.text);
    root.style.setProperty("--sidebar", theme.sidebarBg);
    root.style.setProperty("--sidebar-foreground", theme.textMuted);
    root.style.setProperty("--sidebar-primary", theme.accent);
    root.style.setProperty("--sidebar-primary-foreground", isDark ? theme.bg : "#ffffff");
    root.style.setProperty("--sidebar-accent", theme.accentSoft);
    root.style.setProperty("--sidebar-accent-foreground", theme.text);
    root.style.setProperty("--sidebar-border", isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)");
    root.style.setProperty("--sidebar-ring", theme.accent);

    if (isDark) {
      root.style.setProperty("--shadow-sm", "0 1px 3px rgba(0,0,0,0.2)");
      root.style.setProperty("--shadow-md", "0 4px 12px rgba(0,0,0,0.3)");
      root.style.setProperty("--shadow-lg", "0 8px 24px rgba(0,0,0,0.4)");
    } else {
      root.style.setProperty("--shadow-sm", "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)");
      root.style.setProperty("--shadow-md", "0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.03)");
      root.style.setProperty("--shadow-lg", "0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.03)");
    }
  }, [theme, isDark]);

  return (
    <ColonyThemeContext.Provider value={{ theme, themeId, setThemeById }}>
      {children}
    </ColonyThemeContext.Provider>
  );
}

export function useColonyTheme(): ColonyThemeContextValue {
  const ctx = useContext(ColonyThemeContext);
  if (!ctx) throw new Error("useColonyTheme must be used within ColonyThemeProvider");
  return ctx;
}

/** @deprecated Use ColonyThemeProvider instead */
export const ChatThemeProvider = ColonyThemeProvider;
/** @deprecated Use useColonyTheme instead */
export const useChatTheme = useColonyTheme;
