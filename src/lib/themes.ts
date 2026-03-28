export interface ColonyTheme {
  id: string;
  name: string;
  isDark: boolean;
  bg: string;
  accent: string;
  text: string;
  bgGlow: string;
  sidebarBg: string;
  cardBg: string;
  inputBg: string;
  surface: string;
  textMuted: string;
  textSoft: string;
  accentSoft: string;
  accentGlow: string;
  userBubble: string;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface ThemeInput {
  id: string;
  name: string;
  isDark: boolean;
  bg: string;
  bgGlow: string;
  accent: string;
  text: string;
}

function buildTheme(input: ThemeInput): ColonyTheme {
  const { accent, text, bg, bgGlow, isDark } = input;
  const { r: br, g: bg2, b: bb } = hexToRgb(bg);

  const sidebarBg = isDark
    ? `rgb(${Math.max(br - 5, 0)}, ${Math.max(bg2 - 5, 0)}, ${Math.max(bb - 5, 0)})`
    : `rgb(${Math.max(br - 3, 0)}, ${Math.max(bg2 - 3, 0)}, ${Math.max(bb - 3, 0)})`;

  return {
    ...input,
    sidebarBg,
    cardBg: bgGlow,
    inputBg: bgGlow,
    surface: withAlpha(accent, isDark ? 0.08 : 0.06),
    textMuted: withAlpha(text, isDark ? 0.50 : 0.45),
    textSoft: withAlpha(text, isDark ? 0.70 : 0.65),
    accentSoft: withAlpha(accent, isDark ? 0.15 : 0.10),
    accentGlow: withAlpha(accent, isDark ? 0.12 : 0.08),
    userBubble: withAlpha(accent, isDark ? 0.12 : 0.08),
  };
}

export const COLONY_DARK: ColonyTheme = buildTheme({
  id: "colony-dark", name: "Colony Dark", isDark: true,
  bg: "#0C0C0E", bgGlow: "#161618", accent: "#C4A87A", text: "#E8E8ED",
});

export const COLONY_LIGHT: ColonyTheme = buildTheme({
  id: "colony-light", name: "Colony Light", isDark: false,
  bg: "#F2F1EF", bgGlow: "#FFFFFF", accent: "#8B7355", text: "#1A1A1A",
});

/** @deprecated Use COLONY_DARK instead */
export const COLONY_THEME = COLONY_DARK;

export const THEMES: ColonyTheme[] = [COLONY_DARK, COLONY_LIGHT];

export const THEME_MAP = new Map<string, ColonyTheme>([
  ["colony", COLONY_DARK],
  ["colony-dark", COLONY_DARK],
  ["colony-light", COLONY_LIGHT],
]);

export const DEFAULT_THEME_ID = "colony";

export function getThemeForMode(isDark: boolean): ColonyTheme {
  return isDark ? COLONY_DARK : COLONY_LIGHT;
}

export function getTheme(_id: string): ColonyTheme {
  return COLONY_DARK;
}

const STORAGE_KEY = "colony-chat-theme";

export function getStoredThemeId(): string {
  if (typeof window === "undefined") return DEFAULT_THEME_ID;
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

export function storeThemeId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // storage full or restricted
  }
}

export function applyThemeToElement(el: HTMLElement, theme: ColonyTheme): void {
  el.style.setProperty("--colony-bg", theme.bg);
  el.style.setProperty("--colony-accent", theme.accent);
  el.style.setProperty("--colony-text", theme.text);
  el.style.setProperty("--colony-bg-glow", theme.bgGlow);
  el.style.setProperty("--colony-surface", theme.surface);
  el.style.setProperty("--colony-text-muted", theme.textMuted);
  el.style.setProperty("--colony-text-soft", theme.textSoft);
  el.style.setProperty("--colony-accent-soft", theme.accentSoft);
  el.style.setProperty("--colony-accent-glow", theme.accentGlow);
  el.style.setProperty("--colony-user-bubble", theme.userBubble);
}
