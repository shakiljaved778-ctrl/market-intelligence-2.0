"use client";

import { useEffect, useState } from "react";
import { marketCountdown, type SessionState } from "@/lib/format/session";

function dotColor(state: SessionState): string {
  if (state === "open") return "var(--up)";
  if (state === "pre" || state === "post" || state === "eod") return "var(--signal)";
  return "var(--ink-4)";
}

function eta(min: number | null): string {
  if (min == null || min <= 0) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${m.toString().padStart(2, "0")}m` : `${m}m`;
}

function verb(state: SessionState): string {
  if (state === "open") return "closes";
  if (state === "pre") return "opens";
  return "";
}

/**
 * Market-status pill — live Open/Closed/Pre-market for the US (NASDAQ) and the
 * QSE, with a countdown to the next boundary. Recomputes each minute client-side
 * (the server can't know "now" without risking a hydration mismatch).
 */
export function MarketStatus() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Render a stable placeholder until mounted (avoids hydration mismatch).
  if (!now) {
    return <div className="hidden h-8 w-[150px] lg:block" aria-hidden />;
  }

  const markets = [
    { mkt: "US", ...marketCountdown("NASDAQ", now) },
    { mkt: "QSE", ...marketCountdown("QSE", now) },
  ];

  return (
    <div
      className="border-hairline bg-surface hidden items-center gap-3 rounded-[6px] border px-2.5 py-1.5 lg:flex"
      aria-label="Market status"
    >
      {markets.map((m, i) => {
        const e = eta(m.etaMin);
        const v = verb(m.state);
        return (
          <span key={m.mkt} className="flex items-center gap-1.5">
            {i > 0 ? (
              <span aria-hidden className="text-ink-4">
                ·
              </span>
            ) : null}
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: dotColor(m.state) }}
            />
            <span className="text-ink-2 text-[11px] font-medium">{m.mkt}</span>
            <span className="text-ink-3 text-[11px]">
              {m.state === "open"
                ? "Open"
                : m.state === "pre"
                  ? "Pre"
                  : m.state === "eod"
                    ? "EOD"
                    : m.state === "post"
                      ? "After"
                      : "Closed"}
              {e && v ? (
                <span className="tnum">
                  {" "}
                  {v} {e}
                </span>
              ) : null}
            </span>
          </span>
        );
      })}
    </div>
  );
}
