export type Theme = "dark" | "light";

export const THEME_COOKIE = "mi_theme" as const;
// Dark is the default: a near-black, orange-accented UI (ref: YureCorp business
// landing). Light remains a first-class mode via the toggle.
export const DEFAULT_THEME: Theme = "dark";

export function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}
