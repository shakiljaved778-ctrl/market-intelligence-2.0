"use client";

import { useState } from "react";
import { CB_COOKIE } from "@/lib/theme/theme";

/**
 * Colorblind-safe mode toggle. When on, price direction switches from
 * green/red to blue/orange (AA-tuned per theme via the [data-cb] token
 * overrides). Direction is always ALSO carried by the glyph + sign, so colour
 * is never the only cue — this just improves the colour channel.
 */
export function ColorblindToggle({ on }: { on: boolean }) {
  const [active, setActive] = useState(on);

  function toggle() {
    const next = !active;
    setActive(next);
    const root = document.documentElement;
    if (next) root.setAttribute("data-cb", "1");
    else root.removeAttribute("data-cb");
    document.cookie = `${CB_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }

  const label = active
    ? "Colorblind-safe colours on (blue / orange)"
    : "Colorblind-safe colours off (green / red)";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={label}
      title={label}
      onClick={toggle}
      className={`border-hairline bg-surface inline-flex h-8 items-center gap-1.5 rounded-[6px] border px-2 font-mono text-[11px] tracking-[0.06em] uppercase transition-colors ${
        active ? "text-brand" : "text-ink-3 hover:text-ink"
      }`}
    >
      <span
        aria-hidden
        className="inline-block h-2 w-2 rounded-[2px]"
        style={{ background: active ? "var(--up)" : "var(--down)" }}
      />
      CB
    </button>
  );
}
