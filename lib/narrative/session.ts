import type { Instrument } from "@/content/instruments";
import type { Quote } from "@/lib/providers/types";
import { sessionRecap, type RecapOutput } from "./recap";

/**
 * Build the US session-close recap from REAL stored quotes (Phase 1). Pure: the
 * output is a function of the rows passed in, so it is reproducible from the
 * `inputs` persisted beside it.
 *
 * Publication gate: a recap is produced only when at least `MIN_COVERAGE` of
 * the tracked US equities have a closing quote for the session date. With less
 * than that the day's data is too thin to summarise honestly, and nothing is
 * published.
 */
export const MIN_COVERAGE = 0.8;
/** A sector needs this many priced members before it can be named. */
export const MIN_SECTOR_MEMBERS = 3;

export interface SessionRow {
  instrument: Instrument;
  quote: Quote;
}

const US_VENUES = new Set(["NASDAQ", "NYSE"]);

/** YYYY-MM-DD of a timestamp in New York. */
export function nyDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function nyMinutes(iso: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return h * 60 + m;
}

/** True when the quote was struck at or after the 16:00 New York close (with a
 * small tolerance for feeds that stamp the last trade a little early). */
export function isClosingQuote(q: Quote, sessionDate: string): boolean {
  return nyDate(q.asOf) === sessionDate && nyMinutes(q.asOf) >= 15 * 60 + 45;
}

export interface SessionCloseResult {
  slug: string;
  date: string;
  output: RecapOutput;
  coverage: { priced: number; tracked: number };
  sources: string[];
}

export function buildSessionClose(
  rows: SessionRow[],
  sessionDate: string,
): SessionCloseResult | null {
  const tracked = rows.filter(
    (r) => r.instrument.assetClass === "equity" && US_VENUES.has(r.instrument.exchange),
  );
  const closed = tracked.filter(
    (r) => r.quote.provider !== "fixture" && isClosingQuote(r.quote, sessionDate),
  );
  if (tracked.length === 0 || closed.length / tracked.length < MIN_COVERAGE)
    return null;

  const advancers = closed.filter((r) => r.quote.changePct > 0).length;
  const decliners = closed.filter((r) => r.quote.changePct < 0).length;

  const top = [...closed].sort(
    (a, b) => Math.abs(b.quote.changePct) - Math.abs(a.quote.changePct),
  )[0];

  // Weakest sector by AVERAGE move, among sectors with enough members.
  const bySector = new Map<string, number[]>();
  for (const r of closed) {
    if (!r.instrument.sector) continue;
    bySector.set(r.instrument.sector, [
      ...(bySector.get(r.instrument.sector) ?? []),
      r.quote.changePct,
    ]);
  }
  let weakest: { sector: string; avg: number } | null = null;
  for (const [sector, moves] of bySector) {
    if (moves.length < MIN_SECTOR_MEMBERS) continue;
    const avg = moves.reduce((n, v) => n + v, 0) / moves.length;
    if (!weakest || avg < weakest.avg) weakest = { sector, avg };
  }

  const output = sessionRecap({
    kind: "session_close",
    currency: "USD",
    date: sessionDate,
    indices: [],
    breadth: { advancers, decliners },
    topMover: top
      ? { name: top.instrument.name, changePct: top.quote.changePct }
      : undefined,
    weakestSector: weakest && weakest.avg < 0 ? weakest.sector : undefined,
    universeLabel: `the ${closed.length} US large caps Mizaan tracks`,
  });

  return {
    slug: `session-close-${sessionDate}`,
    date: sessionDate,
    output,
    coverage: { priced: closed.length, tracked: tracked.length },
    sources: [...new Set(closed.map((r) => r.quote.provider))].sort(),
  };
}
