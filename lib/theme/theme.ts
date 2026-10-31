export type Theme = "dark" | "light";

export const THEME_COOKIE = "mi_theme" as const;
// Dark is the default: a near-black canvas lit by an electric-blue glow (rebrand,
// ref: the Abyss landing). Light (cool near-white, navy ink) stays first-class via
// the toggle.
export const DEFAULT_THEME: Theme = "dark";

export function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}
