import type { Candle } from "@/lib/providers/types";

/**
 * Historical figures for the quote page (owner request, 2026-11-19), computed
 * DETERMINISTICALLY from stored daily bars (§9). Nothing is interpolated or
 * estimated: a period with no stored bar at its start shows no return.
 */

export type HistoryPeriod = "1M" | "6M" | "YTD" | "1Y" | "5Y";
export const HISTORY_PERIODS: readonly HistoryPeriod[] = [
  "1M",
  "6M",
  "YTD",
  "1Y",
  "5Y",
];

export interface PeriodReturn {
  period: HistoryPeriod;
  /** Percent change from the first close in the period to the latest close; null if not covered. */
  pct: number | null;
  /** Date (YYYY-MM-DD) of the starting close used. */
  from: string | null;
}

export interface SessionRow {
  date: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number | null;
  /** Percent change from the previous stored close; null for the first bar. */
  changePct: number | null;
}

export interface PriceHistory {
  returns: PeriodReturn[];
  /** Highest high and lowest low over the last 52 weeks of stored bars. */
  high52w: number | null;
  low52w: number | null;
  /** Latest sessions, newest first. */
  sessions: SessionRow[];
  /** First and last stored dates. */
  firstDate: string | null;
  lastDate: string | null;
}

const day = (c: Candle) => c.t.slice(0, 10);

function periodStart(period: HistoryPeriod, last: Date): Date {
  const d = new Date(last);
  switch (period) {
    case "1M":
      d.setUTCMonth(d.getUTCMonth() - 1);
      return d;
    case "6M":
      d.setUTCMonth(d.getUTCMonth() - 6);
      return d;
    case "YTD":
      return new Date(Date.UTC(last.getUTCFullYear(), 0, 1));
    case "1Y":
      d.setUTCFullYear(d.getUTCFullYear() - 1);
      return d;
    case "5Y":
      d.setUTCFullYear(d.getUTCFullYear() - 5);
      return d;
  }
}

/** Sorted, de-duplicated daily bars (one per date, the later entry wins). */
function normalise(candles: Candle[]): Candle[] {
  const byDay = new Map<string, Candle>();
  for (const c of candles) if (Number.isFinite(c.c) && c.c > 0) byDay.set(day(c), c);
  return [...byDay.values()].sort((a, b) => a.t.localeCompare(b.t));
}

export function priceHistory(candles: Candle[], sessionsShown = 10): PriceHistory {
  const bars = normalise(candles);
  const lastBar = bars.at(-1);
  if (!lastBar) {
    return {
      returns: HISTORY_PERIODS.map((period) => ({ period, pct: null, from: null })),
      high52w: null,
      low52w: null,
      sessions: [],
      firstDate: null,
      lastDate: null,
    };
  }
  const last = new Date(`${day(lastBar)}T00:00:00Z`);
  const firstMs = Date.parse(`${day(bars[0]!)}T00:00:00Z`);
  // A period is covered only when stored history reaches back to (about) its
  // start — within 7 days, for weekends and holidays.
  const SLACK_MS = 7 * 86_400_000;

  const returns = HISTORY_PERIODS.map((period): PeriodReturn => {
    const start = periodStart(period, last).getTime();
    if (firstMs > start + SLACK_MS) return { period, pct: null, from: null };
    const base = bars.find((b) => Date.parse(`${day(b)}T00:00:00Z`) >= start);
    if (!base || base === lastBar) return { period, pct: null, from: null };
    return { period, pct: (lastBar.c / base.c - 1) * 100, from: day(base) };
  });

  const yearAgo = periodStart("1Y", last).getTime();
  const lastYear = bars.filter((b) => Date.parse(`${day(b)}T00:00:00Z`) >= yearAgo);
  const high52w = lastYear.length ? Math.max(...lastYear.map((b) => b.h)) : null;
  const low52w = lastYear.length ? Math.min(...lastYear.map((b) => b.l)) : null;

  const sessions: SessionRow[] = [];
  for (let i = bars.length - 1; i >= 0 && sessions.length < sessionsShown; i -= 1) {
    const b = bars[i]!;
    const prev = bars[i - 1];
    sessions.push({
      date: day(b),
      o: b.o,
      h: b.h,
      l: b.l,
      c: b.c,
      v: b.v,
      changePct: prev ? (b.c / prev.c - 1) * 100 : null,
    });
  }

  return {
    returns,
    high52w,
    low52w,
    sessions,
    firstDate: day(bars[0]!),
    lastDate: day(lastBar),
  };
}
