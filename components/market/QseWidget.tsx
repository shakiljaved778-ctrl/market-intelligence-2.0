"use client";

import { useEffect, useRef, useState } from "react";
import {
  TRADINGVIEW_HOME,
  TRADINGVIEW_QUOTES_SCRIPT,
  qseWidgetConfig,
} from "@/lib/providers/tradingview";

/**
 * Qatar Stock Exchange prices in TradingView's own widget (owner decision,
 * 2026-11-27; see lib/providers/tradingview.ts for the scoped exception).
 *
 * - Loads only when the box scrolls near the screen, so it costs nothing above
 *   the fold and never runs during server render.
 * - Uses the site's current light/dark theme at the moment it loads.
 * - Reserves its full height first, so the page never shifts.
 * - Labelled as TradingView's delayed prices — not Mizaan data.
 */
const HEIGHT = 520;

function currentTheme(): "light" | "dark" {
  const set = document.documentElement.getAttribute("data-theme");
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function QseWidget() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = boxRef.current;
    if (!el || near) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  useEffect(() => {
    const el = boxRef.current;
    if (!near || !el) return;
    el.replaceChildren();
    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    const script = document.createElement("script");
    script.src = TRADINGVIEW_QUOTES_SCRIPT;
    script.async = true;
    script.type = "text/javascript";
    script.textContent = JSON.stringify(qseWidgetConfig(currentTheme(), HEIGHT));
    el.append(inner, script);
    return () => el.replaceChildren();
  }, [near]);

  return (
    <div>
      <div
        ref={boxRef}
        className="tradingview-widget-container overflow-hidden"
        style={{ height: HEIGHT }}
      />
      <noscript>
        <p className="text-ink-3 text-[13px]">
          QSE prices load in your browser from TradingView. View them on{" "}
          <a href="https://www.qe.com.qa/" rel="noopener" className="underline">
            the Qatar Stock Exchange website
          </a>
          .
        </p>
      </noscript>
      <p className="text-ink-4 t-micro mt-2">
        Prices by{" "}
        <a
          href={TRADINGVIEW_HOME}
          rel="noopener nofollow"
          target="_blank"
          className="hover:text-ink underline underline-offset-2"
        >
          TradingView
        </a>{" "}
        · delayed at least 15 minutes · not Mizaan data. Informational only.
      </p>
    </div>
  );
}
