"use client";

import { useState } from "react";
import { CB_COOKIE } from "@/lib/theme/theme";

/**
 * Colour-blind-safe mode toggle, with a visible text label (it used to read
 * just "CB"). When on, price direction switches from
 * green/red to blue/orange (AA-tuned per theme via the [data-cb] token
 * overrides). Direction is always ALSO carried by the glyph + sign, so colour
 * is never the only cue — this just improves the colour channel.
 */
export function ColorblindToggle({
  on,
  className = "inline-flex",
}: {
  on: boolean;
  /** Display classes — the caller decides where the control is visible. */
  className?: string;
}) {
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
    ? "Colour-blind-safe colours are on (blue / orange). Switch to green / red."
    : "Colour-blind-safe colours are off (green / red). Switch to blue / orange.";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={label}
      title={label}
      onClick={toggle}
      className={`border-hairline bg-surface min-h-[44px] items-center gap-2 rounded-[6px] border px-3 text-[12px] transition-colors md:min-h-8 md:px-2 ${
        active ? "text-brand" : "text-ink-3 hover:text-ink"
      } ${className}`}
    >
      <span
        aria-hidden
        className="inline-block h-2 w-2 rounded-[2px]"
        style={{ background: active ? "var(--up)" : "var(--down)" }}
      />
      <span className="whitespace-nowrap">Colour-blind-safe colours</span>
      <span className="text-ink-4">{active ? "on" : "off"}</span>
    </button>
  );
}
