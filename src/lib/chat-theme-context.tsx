"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import {
  type ColonyTheme,
  getTheme,
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

  const theme = getTheme(themeId);

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
    root.style.setProperty("--primary-foreground", theme.bg);
    root.style.setProperty("--muted", theme.surface);
    root.style.setProperty("--muted-foreground", theme.textMuted);
    root.style.setProperty("--accent", theme.accentSoft);
    root.style.setProperty("--accent-foreground", theme.accent);
    root.style.setProperty("--border", theme.accentSoft);
    root.style.setProperty("--input", theme.accentSoft);
    root.style.setProperty("--ring", theme.accent);
    root.style.setProperty("--secondary", theme.surface);
    root.style.setProperty("--secondary-foreground", theme.text);
    root.style.setProperty("--sidebar", theme.sidebarBg);
    root.style.setProperty("--sidebar-foreground", theme.textMuted);
    root.style.setProperty("--sidebar-primary", theme.accent);
    root.style.setProperty("--sidebar-primary-foreground", theme.bg);
    root.style.setProperty("--sidebar-accent", theme.accentSoft);
    root.style.setProperty("--sidebar-accent-foreground", theme.text);
    root.style.setProperty("--sidebar-border", theme.accentSoft);
    root.style.setProperty("--sidebar-ring", theme.accent);

    root.style.setProperty("--shadow-sm", `4px 4px 10px rgba(0,0,0,0.3), -4px -4px 10px rgba(255,255,255,0.03)`);
    root.style.setProperty("--shadow-md", `6px 6px 16px rgba(0,0,0,0.4), -6px -6px 16px rgba(255,255,255,0.03)`);
  }, [theme]);

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
