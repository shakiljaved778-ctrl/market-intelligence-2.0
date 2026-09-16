"use client";

import { useState } from "react";
import { THEME_COOKIE, type Theme } from "@/lib/theme/theme";

/**
 * Theme toggle (§12 dark/light). Sets the cookie and flips the
 * `data-theme` attribute on <html> immediately — no reload, no flash.
 */
export function ThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="border-line bg-surface text-text-mid hover:text-text-hi inline-flex h-8 w-8 items-center justify-center rounded-[6px] border transition-colors"
    >
      <span aria-hidden className="text-[15px]">
        {theme === "dark" ? "◑" : "◐"}
      </span>
    </button>
  );
}
