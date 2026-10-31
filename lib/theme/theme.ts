export type Theme = "dark" | "light";

export const THEME_COOKIE = "mi_theme" as const;
// Dark is the default: a warm charcoal-black canvas with a warm-brown accent
// (rebrand). Light (warm cream, near-black ink) stays first-class via the toggle.
export const DEFAULT_THEME: Theme = "dark";

export function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}
