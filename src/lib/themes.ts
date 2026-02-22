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
  bg: string;
  bgGlow: string;
  accent: string;
  text: string;
}

function buildTheme(input: ThemeInput): ColonyTheme {
  const { accent, text, bg, bgGlow } = input;
  const { r: br, g: bg2, b: bb } = hexToRgb(bg);
  const sidebarBg = `rgb(${Math.max(br - 5, 0)}, ${Math.max(bg2 - 5, 0)}, ${Math.max(bb - 5, 0)})`;
  return {
    ...input,
    isDark: true,
    sidebarBg,
    cardBg: bgGlow,
    inputBg: bgGlow,
    surface: withAlpha(accent, 0.08),
    textMuted: withAlpha(text, 0.50),
    textSoft: withAlpha(text, 0.70),
    accentSoft: withAlpha(accent, 0.15),
    accentGlow: withAlpha(accent, 0.12),
    userBubble: withAlpha(accent, 0.12),
  };
}

export const THEMES: ColonyTheme[] = [
  buildTheme({
    id: "samantha", name: "Samantha",
    bg: "#1E1614", bgGlow: "#2A201C", accent: "#C8102E", text: "#F0E6D8",
  }),
  buildTheme({
    id: "theodore", name: "Theodore",
    bg: "#1C1A14", bgGlow: "#28261E", accent: "#C49A2A", text: "#F0EAD8",
  }),
  buildTheme({
    id: "sunset", name: "Sunset",
    bg: "#1E1416", bgGlow: "#2A1E22", accent: "#E8927C", text: "#F0E0D8",
  }),
  buildTheme({
    id: "garden", name: "Garden",
    bg: "#161A14", bgGlow: "#222A1E", accent: "#7A8A45", text: "#E4F0D8",
  }),
  buildTheme({
    id: "letter", name: "Letter",
    bg: "#1A1814", bgGlow: "#26241E", accent: "#B8864A", text: "#F0E8D8",
  }),
  buildTheme({
    id: "noir", name: "Noir",
    bg: "#181818", bgGlow: "#222222", accent: "#A0A0A0", text: "#E8E8E8",
  }),
];

export const THEME_MAP = new Map(THEMES.map((t) => [t.id, t]));

export const DEFAULT_THEME_ID = "samantha";

export function getTheme(id: string): ColonyTheme {
  return THEME_MAP.get(id) ?? THEMES[0];
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
