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

/**
 * Best *live* quote for a symbol — KV cache, then Postgres — or null when the
 * scheduled jobs haven't populated one. Deliberately does NOT fall back to
 * fixtures: callers decide whether to substitute a clearly-labelled sample, so
 * fixture values never masquerade as live market data.
 */
async function liveQuote(symbol: string): Promise<Quote | null> {
  const sym = symbol.toUpperCase();
  const cached = await kvGet<Quote>(`market:quote:${sym}`);
  if (cached) return cached;
  return dbLatestQuote(sym);
}

export async function readQuote(symbol: string): Promise<Quote | null> {
  const sym = symbol.toUpperCase();
  const live = await liveQuote(sym);
  if (live) return live;
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

/**
 * Instruments + latest quote for movers and the screener. Live cached/DB quotes
 * are overlaid onto the fixture universe: for any symbol the scheduled quotes
 * job has populated, the row's numbers come from the *live* quote (and its
 * `quote.provider` names the real source); symbols without a live quote keep
 * their illustrative fixture values, clearly marked as a sample in the UI via
 * `quote.provider === "fixture"`. Reads cache/DB only — no vendor call on render.
 */
export async function readUniverse(): Promise<MarketRow[]> {
  return Promise.all(
    UNIVERSE.map(async (row) => {
      const live = await liveQuote(row.symbol);
      if (!live) return { ...row, quote: universeToQuote(row) };
      // Reflect the live figures in the fields the tables read, so the screener
      // and movers show real prices — not just the quote page.
      return {
        ...row,
        priceUsd: live.priceUsd,
        change: live.change,
        changePct: live.changePct,
        volume: live.volume ?? row.volume,
        marketCapUsd: live.marketCapUsd ?? row.marketCapUsd,
        quote: live,
      };
    }),
  );
}

export async function readMovers(limit = 6): Promise<MarketRow[]> {
  const rows = await readUniverse();
  return [...rows]
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, limit);
}

/** Coverage summary for honest provenance banners: how many rows are live. */
export function coverageOf(rows: MarketRow[]): { live: number; total: number } {
  const live = rows.filter((r) => r.quote.provider.toLowerCase() !== "fixture").length;
  return { live, total: rows.length };
}
