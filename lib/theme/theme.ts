// Resolved theme (what actually paints).
export type Theme = "dark" | "light";

// User preference — the toggle has three states; "system" follows the OS via the
// prefers-color-scheme media query (no explicit data-theme attribute is set, so
// there is no flash and no JS is needed to resolve it).
export type ThemePref = "system" | "dark" | "light";

export const THEME_COOKIE = "mi_theme" as const;
export const CB_COOKIE = "mi_cb" as const; // colorblind-safe mode

export const DEFAULT_PREF: ThemePref = "system";
// Back-compat: a resolved fallback for the rare SSR consumer that needs one.
export const DEFAULT_THEME: Theme = "dark";

export function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}

export function isThemePref(value: unknown): value is ThemePref {
  return value === "system" || value === "dark" || value === "light";
}
