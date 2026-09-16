import { getDb } from "@/lib/db/client";
import { candlesDaily, instruments } from "@/lib/db/schema";
import type { Candle } from "@/lib/providers/types";

/**
 * Persist daily candles to candles_daily (§6 EOD backfill). Intraday bars stay
 * in the cache and expire by TTL; only daily bars are stored. No-op with no DB.
 */
export async function persistDailyCandles(
  symbol: string,
  candles: Candle[],
): Promise<number> {
  const db = getDb();
  if (!db || candles.length === 0) return 0;
  const sym = symbol.toUpperCase();

  await db
    .insert(instruments)
    .values({ symbol: sym, name: sym, assetClass: "equity" })
    .onConflictDoNothing();

  const rows = candles.map((c) => ({
    symbol: sym,
    date: c.t.slice(0, 10),
    o: c.o,
    h: c.h,
    l: c.l,
    c: c.c,
    v: c.v,
    adjClose: c.c,
  }));

  await db.insert(candlesDaily).values(rows).onConflictDoNothing();
  return rows.length;
}
