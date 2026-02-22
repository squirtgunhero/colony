export interface ColonyTheme {
  id: string;
  name: string;
  bg: string;
  accent: string;
  text: string;
  bgGlow: string;
  surface: string;
  textMuted: string;
  textSoft: string;
  accentSoft: string;
  accentGlow: string;
  userBubble: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const nr = Math.min(255, Math.round(r + (255 - r) * amount));
  const ng = Math.min(255, Math.round(g + (255 - g) * amount));
  const nb = Math.min(255, Math.round(b + (255 - b) * amount));
  return `rgb(${nr}, ${ng}, ${nb})`;
}

function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildTheme(id: string, name: string, bg: string, accent: string, text: string): ColonyTheme {
  return {
    id,
    name,
    bg,
    accent,
    text,
    bgGlow: lighten(bg, 0.08),
    surface: withAlpha(accent, 0.04),
    textMuted: withAlpha(text, 0.45),
    textSoft: withAlpha(text, 0.7),
    accentSoft: withAlpha(accent, 0.15),
    accentGlow: withAlpha(accent, 0.08),
    userBubble: withAlpha(accent, 0.12),
  };
}

export const THEMES: ColonyTheme[] = [
  buildTheme("ember", "Ember", "#1a1411", "#cf9b46", "#e8ddd0"),
  buildTheme("midnight", "Midnight", "#0f1419", "#4a9ece", "#d0dde8"),
  buildTheme("forest", "Forest", "#111a14", "#5fa66a", "#d0e8d5"),
  buildTheme("rose", "Rose", "#1a1114", "#ce6a8a", "#e8d0da"),
  buildTheme("slate", "Slate", "#141516", "#8a8d93", "#dddee0"),
  buildTheme("violet", "Violet", "#14111a", "#8a6ace", "#dad0e8"),
];

export const THEME_MAP = new Map(THEMES.map((t) => [t.id, t]));

export const DEFAULT_THEME_ID = "ember";

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
