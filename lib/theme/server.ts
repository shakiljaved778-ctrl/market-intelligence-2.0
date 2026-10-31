import { cookies } from "next/headers";
import {
  CB_COOKIE,
  DEFAULT_PREF,
  DEFAULT_THEME,
  isTheme,
  isThemePref,
  THEME_COOKIE,
  type Theme,
  type ThemePref,
} from "./theme";

/** Read the theme preference in a Server Component so <html> renders with no flash. */
export async function getThemePref(): Promise<ThemePref> {
  const store = await cookies();
  const value = store.get(THEME_COOKIE)?.value;
  return isThemePref(value) ? value : DEFAULT_PREF;
}

/** Whether colorblind-safe mode is on (persisted in a cookie). */
export async function getColorblind(): Promise<boolean> {
  const store = await cookies();
  return store.get(CB_COOKIE)?.value === "1";
}

/**
 * A resolved theme for the rare SSR consumer that needs a concrete value
 * (e.g. a chart's server-rendered defaults). "system" can't be resolved on the
 * server, so it falls back to DEFAULT_THEME; the painted theme is still correct
 * because CSS resolves it via prefers-color-scheme.
 */
export async function getTheme(): Promise<Theme> {
  const pref = await getThemePref();
  return isTheme(pref) ? pref : DEFAULT_THEME;
}
