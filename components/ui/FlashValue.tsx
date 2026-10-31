"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Wraps a changing numeric value and briefly flashes the cell (up-soft /
 * down-soft, 600ms) when it updates — the Bloomberg-style price tick. Direction
 * is still carried by the sign/glyph in `children`, so colour is never the only
 * cue. No layout shift (the flash is a background tint only).
 *
 * This is the mechanism; it fires only when `value` actually changes, i.e. once
 * live quotes stream. In fixture/sample mode values are static, so it's dormant.
 */
export function FlashValue({
  value,
  children,
  className,
}: {
  value: number;
  children: React.ReactNode;
  className?: string;
}) {
  const prev = useRef(value);
  const [flash, setFlash] = useState<"" | "flash-up" | "flash-down">("");

  useEffect(() => {
    if (prev.current !== value) {
      setFlash(value > prev.current ? "flash-up" : "flash-down");
      prev.current = value;
      const id = setTimeout(() => setFlash(""), 600);
      return () => clearTimeout(id);
    }
  }, [value]);

  return <span className={`${flash} ${className ?? ""}`}>{children}</span>;
}
