import { instrumentBySymbol } from "@/content/instruments";
import { cacheGet } from "@/lib/cache/swr";
import { dbLatestQuotes } from "@/lib/db/queries/quotes";
import { dbCandles } from "@/lib/db/queries/read";
import { demo } from "@/lib/demo/fixtures";
import { isDemoMode } from "@/lib/demo/mode";
import { sessionFor } from "@/lib/format/session";
import type { Candle, Quote, Range } from "@/lib/providers/types";

/**
 * The quote service (Phase 1 — truth and trust). ONE read path for every price
 * surface: ticker, movers, heatmap, screener, stock page, recap.
 *
 *   - Reads what the scheduled jobs stored (Postgres is the durable
 *     last-known-good store; the cache is an accelerator). It never calls a
 *     vendor, so no page render can trigger a provider request.
 *   - Every result says where the number came from, when, and how delayed.
 *   - There is NO fixture fallback. When nothing real is stored the result is
 *     `unavailable` and the surface renders an empty state. Fixtures appear only
 *     under DEMO_MODE=1, flagged `demo: true` so the UI labels them.
 */

export type PriceStatus = "ok" | "eod" | "unavailable";

export interface Priced<T> {
  /**
   * ok          — an in-session value from the feed.
   * eod         — a last close / end-of-day value (or an EOD-only feed).
   * unavailable — nothing real is stored (or it is too old to show).
   */
  status: PriceStatus;
  value: T | null;
  /** Provider id as recorded by the job ("finnhub", "ecb", …). */
  source: string | null;
  /** ISO time the value refers to. */
  asOf: string | null;
  /** Feed delay in minutes at fetch time (0 = not delayed, 1440 = EOD feed). */
  delayMinutes: number | null;
  /** True only under DEMO_MODE — the value is a committed fixture. */
  demo: boolean;
}

const UNAVAILABLE = {
  status: "unavailable",
  value: null,
  source: null,
  asOf: null,
  delayMinutes: null,
  demo: false,
} as const;

function unavailable<T>(): Priced<T> {
  return { ...UNAVAILABLE };
}

/** Oldest value we will still show, by asset class. Beyond this → unavailable. */
export const MAX_AGE_HOURS = { equity: 120, crypto: 24, index: 120 } as const;

/** A quote is usable when its price is a positive finite number and it is not too old. */
export function isUsableQuote(q: Quote, now: number = Date.now()): boolean {
  if (!Number.isFinite(q.priceUsd) || q.priceUsd <= 0) return false;
  const asOf = Date.parse(q.asOf);
  if (!Number.isFinite(asOf)) return false;
  const cls = instrumentBySymbol(q.symbol)?.assetClass ?? "equity";
  const maxAgeMs = (MAX_AGE_HOURS[cls] * 60 + (q.dataDelayMinutes ?? 0)) * 60_000;
  return now - asOf <= maxAgeMs;
}

/** Wrap a stored quote with its status. EOD when the feed is EOD-only or the
 * value was struck after that venue's close (i.e. it is the last close). */
export function priced(q: Quote, isDemo = false): Priced<Quote> {
  const ref = instrumentBySymbol(q.symbol);
  let status: PriceStatus = "ok";
  if (q.dataDelayMinutes >= 1440) status = "eod";
  else if (ref && ref.assetClass !== "crypto") {
    const s = sessionFor(ref.exchange, new Date(q.asOf)).state;
    if (s === "post" || s === "closed") status = "eod";
  }
  return {
    status,
    value: q,
    source: q.provider,
    asOf: q.asOf,
    delayMinutes: q.dataDelayMinutes,
    demo: isDemo,
  };
}

// ── Stored quotes (one batched read, memoised briefly per instance) ──────────

const MEMO_MS = 60_000;
let memo: { at: number; map: Map<string, Quote> } | null = null;
let inflight: Promise<Map<string, Quote>> | null = null;

async function storedQuotes(): Promise<Map<string, Quote>> {
  const now = Date.now();
  if (memo && now - memo.at < MEMO_MS) return memo.map;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const map = await dbLatestQuotes();
      memo = { at: Date.now(), map };
      return map;
    } catch (err) {
      // A DB error must never crash a page or fall back to invented numbers.
      console.error("[market] stored-quote read failed:", err);
      return memo?.map ?? new Map<string, Quote>();
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Test seam: drop the memoised quote map. */
export function __resetQuoteMemo(): void {
  memo = null;
  inflight = null;
}

function demoQuote(symbol: string): Quote | null {
  const row = demo.universeRow(symbol);
  if (!row) return null;
  return {
    symbol: row.symbol,
    priceUsd: row.priceUsd,
    nativePrice: null,
    nativeCurrency: row.nativeCurrency,
    fxRateUsed: 1,
    change: row.change,
    changePct: row.changePct,
    open: null,
    high: null,
    low: null,
    prevClose: row.priceUsd - row.change,
    volume: row.volume,
    marketCapUsd: row.marketCapUsd,
    provider: "demo",
    dataDelayMinutes: row.dataDelayMinutes,
    asOf: new Date().toISOString(),
  };
}

/** The best real quote for a symbol, with its provenance — or `unavailable`. */
export async function getQuote(symbol: string): Promise<Priced<Quote>> {
  const sym = symbol.toUpperCase();
  const stored = (await storedQuotes()).get(sym);
  if (stored && stored.provider !== "fixture" && isUsableQuote(stored)) {
    return priced(stored);
  }
  // Cache fallback (e.g. a deployment with a cache but no database).
  const cached = await cacheGet<Quote>(`market:quote:${sym}`);
  if (cached && cached.provider !== "fixture" && isUsableQuote(cached)) {
    return priced(cached);
  }
  if (isDemoMode()) {
    const d = demoQuote(sym);
    if (d) return priced(d, true);
  }
  return unavailable();
}

/** Real quotes for many symbols at once (one stored read). */
export async function getQuotes(
  symbols: string[],
): Promise<Map<string, Priced<Quote>>> {
  const stored = await storedQuotes();
  const out = new Map<string, Priced<Quote>>();
  for (const raw of symbols) {
    const sym = raw.toUpperCase();
    const q = stored.get(sym);
    if (q && q.provider !== "fixture" && isUsableQuote(q)) {
      out.set(sym, priced(q));
    } else if (isDemoMode()) {
      const d = demoQuote(sym);
      if (d) out.set(sym, priced(d, true));
    }
  }
  return out;
}

/** A stored price series with its source — or `unavailable`. Never generated. */
export async function getSeries(
  symbol: string,
  range: Range,
): Promise<Priced<Candle[]>> {
  const sym = symbol.toUpperCase();
  const cached = await cacheGet<{ candles: Candle[]; provider: string } | Candle[]>(
    `market:candles:${sym}:${range}`,
  );
  if (cached && !Array.isArray(cached) && cached.candles.length > 1) {
    return seriesResult(cached.candles, cached.provider, range);
  }
  try {
    const stored = await dbCandles(sym, range);
    if (stored.candles.length > 1) {
      return seriesResult(stored.candles, stored.provider ?? "stored", range);
    }
  } catch (err) {
    console.error("[market] stored-series read failed:", err);
  }
  if (isDemoMode()) {
    const d = demo.candles(sym, range);
    if (d.length > 1) return { ...seriesResult(d, "demo", range), demo: true };
  }
  return unavailable();
}

function seriesResult(
  candles: Candle[],
  provider: string,
  range: Range,
): Priced<Candle[]> {
  const intraday = range === "1D" || range === "5D";
  return {
    status: intraday ? "ok" : "eod",
    value: candles,
    source: provider,
    asOf: candles.at(-1)?.t ?? null,
    delayMinutes: intraday ? 0 : 1440,
    demo: false,
  };
}
