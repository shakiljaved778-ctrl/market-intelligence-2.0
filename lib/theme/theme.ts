export type Theme = "dark" | "light";

export const THEME_COOKIE = "mi_theme" as const;
// Light is the default: a warm cream-sage UI with deep forest-green ink (rebrand,
// ref: the golf landing). Dark (deep forest green) remains first-class via the toggle.
export const DEFAULT_THEME: Theme = "light";

export function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}
