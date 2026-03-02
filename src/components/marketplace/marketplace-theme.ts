import { withAlpha } from "@/lib/themes";

export const BRAND = {
  bg: "#1A1A1A",
  bgGlow: "#242424",
  accent: "#C9A962",
  text: "#F0E8D8",
  textMuted: withAlpha("#F0E8D8", 0.5),
  textSoft: withAlpha("#F0E8D8", 0.7),
  accentSoft: withAlpha("#C9A962", 0.15),
  accentGlow: withAlpha("#C9A962", 0.12),
  sidebarBg: "#151515",
  cardBg: "#242424",
} as const;
