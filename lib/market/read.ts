import { getKvStore } from "@/lib/cache/store";
import { dbCandles, dbLatestQuote } from "@/lib/db/queries/read";
import { fixtureCandles } from "@/fixtures/candles";
import { UNIVERSE, universeBySymbol, type UniverseRow } from "@/fixtures/universe";
import type { Candle, Quote, Range } from "@/lib/providers/types";

/**
 * Read-only market layer for page rendering. Order: KV cache → Postgres →
 * fixtures. It NEVER calls a provider/vendor (§6, §17) — the scheduled jobs are
 * the only writers. This is what proves "no vendor call fires on page render".
 */

async function kvGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await getKvStore().get(key);
    if (!raw) return null;
    const env = JSON.parse(raw) as { v: T };
    return env.v ?? null;
  } catch {
    return null;
  }
}

function universeToQuote(row: UniverseRow): Quote {
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
    provider: "fixture",
    dataDelayMinutes: row.dataDelayMinutes,
    asOf: "2026-09-16T20:00:00.000Z",
  };
}

export async function readQuote(symbol: string): Promise<Quote | null> {
  const sym = symbol.toUpperCase();
  const cached = await kvGet<Quote>(`market:quote:${sym}`);
  if (cached) return cached;
  const fromDb = await dbLatestQuote(sym);
  if (fromDb) return fromDb;
  const row = universeBySymbol(sym);
  return row ? universeToQuote(row) : null;
}

export async function readCandles(symbol: string, range: Range): Promise<Candle[]> {
  const sym = symbol.toUpperCase();
  const cached = await kvGet<Candle[]>(`market:candles:${sym}:${range}`);
  if (cached && cached.length > 0) return cached;
  const fromDb = await dbCandles(sym, range);
  if (fromDb.length > 0) return fromDb;
  return fixtureCandles(sym, range);
}

export interface MarketRow extends UniverseRow {
  quote: Quote;
}

/** Instruments + latest quote for movers and the screener (fixtures for now). */
export async function readUniverse(): Promise<MarketRow[]> {
  return UNIVERSE.map((row) => ({ ...row, quote: universeToQuote(row) }));
}

export async function readMovers(limit = 6): Promise<MarketRow[]> {
  const rows = await readUniverse();
  return [...rows]
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, limit);
}
