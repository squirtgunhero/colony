import { z } from "zod";
import type { ActionDefinition, ActionResult, LAMContext } from "./types";
import { prisma } from "@/lib/prisma";
import { THEME_MAP, THEMES } from "@/lib/themes";

const themeNames = THEMES.map((t) => t.id);
const themeAliases: Record<string, string> = {
  amber: "ember",
  warm: "ember",
  orange: "ember",
  blue: "midnight",
  navy: "midnight",
  cool: "midnight",
  green: "forest",
  earth: "forest",
  nature: "forest",
  pink: "rose",
  plum: "rose",
  gray: "slate",
  grey: "slate",
  silver: "slate",
  neutral: "slate",
  purple: "violet",
  indigo: "violet",
  lavender: "violet",
};

function resolveTheme(input: string): string | null {
  const lower = input.toLowerCase().trim();
  if (THEME_MAP.has(lower)) return lower;
  if (themeAliases[lower]) return themeAliases[lower];
  const match = THEMES.find((t) => t.name.toLowerCase() === lower);
  if (match) return match.id;
  return null;
}

export const setThemeAction: ActionDefinition = {
  name: "setTheme",
  description: `Change Colony's chat theme. Available themes: ${themeNames.join(", ")}. Also accepts color words like "blue", "green", "purple", etc.`,
  parameters: z.object({
    theme: z.string().describe("Theme name or color keyword"),
  }),
  riskTier: 1,
  execute: async (
    params: unknown,
    context: LAMContext
  ): Promise<ActionResult> => {
    const { theme: themeInput } = params as { theme: string };
    const resolved = resolveTheme(themeInput);

    if (!resolved) {
      const available = THEMES.map((t) => `${t.name} (${t.id})`).join(", ");
      return {
        success: false,
        message: `I don't recognize that theme. Available themes: ${available}`,
      };
    }

    await prisma.profile.update({
      where: { id: context.profileId },
      data: { theme: resolved },
    });

    const themeName = THEME_MAP.get(resolved)?.name ?? resolved;

    return {
      success: true,
      message: `Theme changed to ${themeName}. Refresh the page or the chat view will update automatically.`,
      data: { theme: resolved },
    };
  },
};
