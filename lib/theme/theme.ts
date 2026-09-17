export type Theme = "dark" | "light";

export const THEME_COOKIE = "mi_theme" as const;
// Light is the default: an airy, high-contrast editorial surface (ref: Bloomberg).
// Dark remains a first-class mode via the toggle.
export const DEFAULT_THEME: Theme = "light";

export function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}
