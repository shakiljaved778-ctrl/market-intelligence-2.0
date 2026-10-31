"use client";

import { useState } from "react";
import { THEME_COOKIE, type ThemePref } from "@/lib/theme/theme";

const OPTIONS: { value: ThemePref; glyph: string; label: string }[] = [
  { value: "system", glyph: "◎", label: "System theme" },
  { value: "light", glyph: "☀", label: "Light theme" },
  { value: "dark", glyph: "☾", label: "Dark theme" },
];

/**
 * Three-state theme control (system / light / dark). Persists the choice in a
 * cookie and applies it immediately with no reload: "system" removes the
 * data-theme attribute so CSS resolves via prefers-color-scheme (no flash),
 * "light"/"dark" set it explicitly.
 */
export function ThemeToggle({ pref }: { pref: ThemePref }) {
  const [current, setCurrent] = useState<ThemePref>(pref);

  function choose(next: ThemePref) {
    setCurrent(next);
    const root = document.documentElement;
    if (next === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", next);
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="border-hairline bg-surface inline-flex items-center rounded-[6px] border p-0.5"
    >
      {OPTIONS.map((o) => {
        const active = current === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            title={o.label}
            onClick={() => choose(o.value)}
            className={`inline-flex h-7 w-7 items-center justify-center rounded-[4px] text-[13px] transition-colors ${
              active ? "bg-brand-soft text-brand" : "text-ink-3 hover:text-ink"
            }`}
          >
            <span aria-hidden>{o.glyph}</span>
          </button>
        );
      })}
    </div>
  );
}
