import { cacheGet, cachePut } from "@/lib/cache/swr";
import { INSTRUMENTS } from "@/content/instruments";
import {
  finnhubEarningsCalendar,
  finnhubIpoCalendar,
  type EarningsEvent,
  type IpoEvent,
} from "@/lib/providers/finnhub";

/**
 * Earnings and IPO calendars (brief §5, 2026-11-28; behind the "calendar"
 * flag). The macro job fetches them from Finnhub every few hours and keeps one
 * copy in KV; pages read only that copy. Earnings are limited to companies in
 * Mizaan's universe, so the list is about names readers follow. Nothing here
 * is estimated: estimates shown are Finnhub's consensus figures, labelled so.
 */
export const CALENDAR_KEY = "calendar:v1";
export const EARNINGS_AHEAD_DAYS = 14;
export const IPO_BACK_DAYS = 7;
export const IPO_AHEAD_DAYS = 30;

export interface StoredCalendar {
  fetchedAt: string;
  source: "Finnhub";
  earnings: EarningsEvent[] | null;
  ipos: IpoEvent[] | null;
}

const day = (t: number) => new Date(t).toISOString().slice(0, 10);

/** PURE: upcoming earnings for names we cover, soonest first. */
export function earningsForUniverse(
  rows: EarningsEvent[],
  universe: Set<string>,
  now: number,
): EarningsEvent[] {
  const today = day(now);
  return rows
    .filter((r) => universe.has(r.symbol.toUpperCase()) && r.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol));
}

/** PURE: IPOs from the past week and the coming month, newest first. */
export function iposInWindow(rows: IpoEvent[], now: number): IpoEvent[] {
  const from = day(now - IPO_BACK_DAYS * 86_400_000);
  const to = day(now + IPO_AHEAD_DAYS * 86_400_000);
  return rows
    .filter((r) => r.date >= from && r.date <= to && (r.name ?? r.symbol))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Job side: fetch both calendars and store the copy pages read. */
export async function refreshCalendars(now: number = Date.now()): Promise<number> {
  const universe = new Set(
    INSTRUMENTS.filter((i) => i.assetClass === "equity").map((i) => i.symbol),
  );
  const [earn, ipo] = await Promise.all([
    finnhubEarningsCalendar(day(now), day(now + EARNINGS_AHEAD_DAYS * 86_400_000)),
    finnhubIpoCalendar(
      day(now - IPO_BACK_DAYS * 86_400_000),
      day(now + IPO_AHEAD_DAYS * 86_400_000),
    ),
  ]);
  if (earn === null && ipo === null) return 0;
  const prev = await cacheGet<StoredCalendar>(CALENDAR_KEY);
  const stored: StoredCalendar = {
    fetchedAt: new Date(now).toISOString(),
    source: "Finnhub",
    // Keep the last good copy of a calendar the provider did not answer.
    earnings: earn
      ? earningsForUniverse(earn, universe, now)
      : (prev?.earnings ?? null),
    ipos: ipo ? iposInWindow(ipo, now) : (prev?.ipos ?? null),
  };
  await cachePut(CALENDAR_KEY, 3 * 24 * 60 * 60, stored);
  return (stored.earnings?.length ?? 0) + (stored.ipos?.length ?? 0);
}

/** Page side: the stored copy, re-filtered to today. */
export async function readCalendars(
  now: number = Date.now(),
): Promise<StoredCalendar | null> {
  const c = await cacheGet<StoredCalendar>(CALENDAR_KEY);
  if (!c) return null;
  const today = day(now);
  return {
    ...c,
    earnings: c.earnings?.filter((e) => e.date >= today) ?? null,
    ipos: c.ipos ? iposInWindow(c.ipos, now) : null,
  };
}
