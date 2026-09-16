import { and, desc, eq, gte } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { candlesDaily, instruments, quotes } from "@/lib/db/schema";
import { rangeToWindow, ymd } from "@/lib/providers/range";
import type { Candle, Quote, Range } from "@/lib/providers/types";

/**
 * Read-only DB accessors for page rendering (§6 budget discipline): pages read
 * what the scheduled jobs persisted — they never call a vendor. Every function
 * returns null/[] when there is no database so callers fall back to fixtures.
 */

export async function dbLatestQuote(symbol: string): Promise<Quote | null> {
  const db = getDb();
  if (!db) return null;
  const sym = symbol.toUpperCase();
  const [row] = await db
    .select()
    .from(quotes)
    .where(eq(quotes.symbol, sym))
    .orderBy(desc(quotes.ts))
    .limit(1);
  if (!row) return null;
  const [inst] = await db
    .select()
    .from(instruments)
    .where(eq(instruments.symbol, sym))
    .limit(1);
  return {
    symbol: sym,
    priceUsd: row.priceUsd,
    nativePrice: row.nativePrice,
    nativeCurrency: inst?.nativeCurrency ?? "USD",
    fxRateUsed: row.fxRateUsed,
    change: row.change ?? 0,
    changePct: row.changePct ?? 0,
    open: row.open,
    high: row.high,
    low: row.low,
    prevClose: row.prevClose,
    volume: row.volume,
    marketCapUsd: row.marketCapUsd,
    provider: row.provider,
    dataDelayMinutes: inst?.dataDelayMinutes ?? 0,
    asOf: row.ts.toISOString(),
  };
}

export async function dbCandles(symbol: string, range: Range): Promise<Candle[]> {
  const db = getDb();
  if (!db) return [];
  const w = rangeToWindow(range);
  const rows = await db
    .select()
    .from(candlesDaily)
    .where(
      and(
        eq(candlesDaily.symbol, symbol.toUpperCase()),
        gte(candlesDaily.date, ymd(w.from)),
      ),
    )
    .orderBy(candlesDaily.date);
  return rows.map(
    (r): Candle => ({
      t: new Date(`${r.date}T00:00:00.000Z`).toISOString(),
      o: r.o,
      h: r.h,
      l: r.l,
      c: r.c,
      v: r.v,
    }),
  );
}
