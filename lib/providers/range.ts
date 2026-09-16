import type { Range } from "./types";

export interface RangeWindow {
  from: Date;
  to: Date;
  /** Polygon aggregate params. */
  multiplier: number;
  timespan: "minute" | "hour" | "day" | "week";
  /** Intraday ranges use finer bars and shorter cache. */
  intraday: boolean;
}

/**
 * Map a chart range (§13: 1D/5D/1M/6M/YTD/1Y/5Y) to a date window and bar size.
 * All windows are computed from `now` so results are deterministic in tests.
 */
export function rangeToWindow(range: Range, now: Date = new Date()): RangeWindow {
  const to = now;
  const from = new Date(now);
  switch (range) {
    case "1D":
      from.setDate(from.getDate() - 1);
      return { from, to, multiplier: 5, timespan: "minute", intraday: true };
    case "5D":
      from.setDate(from.getDate() - 5);
      return { from, to, multiplier: 30, timespan: "minute", intraday: true };
    case "1M":
      from.setMonth(from.getMonth() - 1);
      return { from, to, multiplier: 1, timespan: "day", intraday: false };
    case "6M":
      from.setMonth(from.getMonth() - 6);
      return { from, to, multiplier: 1, timespan: "day", intraday: false };
    case "YTD":
      from.setMonth(0, 1);
      from.setHours(0, 0, 0, 0);
      return { from, to, multiplier: 1, timespan: "day", intraday: false };
    case "1Y":
      from.setFullYear(from.getFullYear() - 1);
      return { from, to, multiplier: 1, timespan: "day", intraday: false };
    case "5Y":
      from.setFullYear(from.getFullYear() - 5);
      return { from, to, multiplier: 1, timespan: "week", intraday: false };
  }
}

export function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}
