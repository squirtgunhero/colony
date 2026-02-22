"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import {
  type ColonyTheme,
  getTheme,
  getStoredThemeId,
  storeThemeId,
  DEFAULT_THEME_ID,
} from "./themes";

interface ChatThemeContextValue {
  theme: ColonyTheme;
  themeId: string;
  setThemeById: (id: string) => void;
}

const ChatThemeContext = createContext<ChatThemeContextValue | null>(null);

export function ChatThemeProvider({ children }: { children: ReactNode }) {
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

  return (
    <ChatThemeContext.Provider value={{ theme, themeId, setThemeById }}>
      {children}
    </ChatThemeContext.Provider>
  );
}

export function useChatTheme(): ChatThemeContextValue {
  const ctx = useContext(ChatThemeContext);
  if (!ctx) throw new Error("useChatTheme must be used within ChatThemeProvider");
  return ctx;
}
