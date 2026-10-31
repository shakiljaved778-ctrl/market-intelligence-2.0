"use client";

import { useEffect, useState } from "react";

const RAN_KEY = "mi_counts_ran";

/**
 * Animated counter that runs ONCE per session (sessionStorage flag) and
 * respects prefers-reduced-motion. After the first run it shows the final value
 * instantly on later navigations, so it never re-animates distractingly.
 */
export function CountUp({
  value,
  suffix = "",
  durationMs = 900,
  className,
}: {
  value: number;
  suffix?: string;
  durationMs?: number;
  className?: string;
}) {
  const [n, setN] = useState(value);

  useEffect(() => {
    let ran = false;
    try {
      ran = sessionStorage.getItem(RAN_KEY) === "1";
    } catch {
      /* ignore */
    }
    const reduce =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (ran || reduce) {
      setN(value);
      return;
    }
    setN(0);
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else
        try {
          sessionStorage.setItem(RAN_KEY, "1");
        } catch {
          /* ignore */
        }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return (
    <span className={`tnum ${className ?? ""}`}>
      {n.toLocaleString("en-US")}
      {suffix}
    </span>
  );
}
