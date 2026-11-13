import { INSTRUMENTS, type Instrument } from "@/content/instruments";
import { cacheGet } from "@/lib/cache/swr";
import { dbLatestFundamentals } from "@/lib/db/queries/fundamentals";
import { dbRecentCloses } from "@/lib/db/queries/read";
import { isDemoMode } from "@/lib/demo/mode";
import { demo } from "@/lib/demo/fixtures";
import { getQuote, getQuotes, getSeries, type Priced } from "@/lib/market/service";
import type { Candle, Fundamentals, Quote, Range } from "@/lib/providers/types";

/**
 * Read-only market layer for page rendering, built on the quote service
 * (lib/market/service.ts). It NEVER calls a provider (§6, §17) — the scheduled
 * jobs are the only writers — and it never substitutes an invented number: an
 * instrument without a real stored quote is simply absent from the result.
 */

/** The real quote for a symbol, or null. See `getQuote` for provenance. */
export async function readQuote(symbol: string): Promise<Quote | null> {
  return (await getQuote(symbol)).value;
}

/** A stored price series, or [] — never a generated one. */
export async function readCandles(symbol: string, range: Range): Promise<Candle[]> {
  return (await getSeries(symbol, range)).value ?? [];
}

/**
 * Latest stored fundamentals for a symbol: cache → Postgres. Null when the
 * daily job has not stored any (demo mode substitutes a labelled fixture).
 */
export async function readFundamentals(symbol: string): Promise<Fundamentals | null> {
  const sym = symbol.toUpperCase();
  const cached = await cacheGet<Fundamentals>(`market:fundamentals:${sym}`);
  if (cached && cached.provider !== "fixture") return cached;
  try {
    const fromDb = await dbLatestFundamentals(sym);
    if (fromDb && fromDb.provider !== "fixture") return fromDb;
  } catch (err) {
    console.error("[market] fundamentals read failed:", err);
  }
  return demo.fundamentals(sym);
}

/** An instrument together with its real, provenance-carrying quote. */
export interface MarketRow extends Instrument {
  priceUsd: number;
  change: number;
  changePct: number;
  marketCapUsd: number | null;
  volume: number | null;
  quote: Quote;
  priced: Priced<Quote>;
}

/**
 * Every instrument that has a real stored quote, with the numbers taken from
 * that quote only. Instruments no feed covers are omitted (see `coverageOf`).
 * One batched read — no per-symbol round-trips, no vendor call on render.
 */
export async function readUniverse(): Promise<MarketRow[]> {
  const quotes = await getQuotes(INSTRUMENTS.map((i) => i.symbol));
  const rows: MarketRow[] = [];
  for (const inst of INSTRUMENTS) {
    const p = quotes.get(inst.symbol);
    if (!p || !p.value) continue;
    const q = p.value;
    rows.push({
      ...inst,
      priceUsd: q.priceUsd,
      change: q.change,
      changePct: q.changePct,
      marketCapUsd: q.marketCapUsd,
      volume: q.volume,
      quote: q,
      priced: p,
    });
  }
  return rows;
}

export async function readMovers(limit = 6): Promise<MarketRow[]> {
  const rows = await readUniverse();
  return [...rows]
    .filter((r) => Number.isFinite(r.changePct))
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, limit);
}

/** How many instruments in the reference list currently carry a real price. */
export function coverageOf(rows: MarketRow[]): { priced: number; total: number } {
  return { priced: rows.length, total: INSTRUMENTS.length };
}

/**
 * Recent daily closes per symbol for the trend column — one stored read. A
 * symbol with no stored series is absent (the cell shows a dash, never a
 * generated line).
 */
export async function readTrends(symbols: string[]): Promise<Record<string, number[]>> {
  const out: Record<string, number[]> = {};
  try {
    for (const [sym, closes] of await dbRecentCloses(symbols)) {
      if (closes.length > 1) out[sym] = closes.slice(-30);
    }
  } catch (err) {
    console.error("[market] trend read failed:", err);
  }
  if (isDemoMode()) {
    for (const sym of symbols) {
      if (!out[sym]) out[sym] = demo.candles(sym, "1M").map((c) => c.c);
    }
  }
  return out;
}
