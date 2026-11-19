import { inArray, sql } from "drizzle-orm";
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
  provider: string | null = null,
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
    provider,
  }));

  // A bar for the current day can be revised until the close, so the latest
  // provider value replaces what was stored for that date.
  await db
    .insert(candlesDaily)
    .values(rows)
    .onConflictDoUpdate({
      target: [candlesDaily.symbol, candlesDaily.date],
      set: {
        o: sql`excluded.o`,
        h: sql`excluded.h`,
        l: sql`excluded.l`,
        c: sql`excluded.c`,
        v: sql`excluded.v`,
        adjClose: sql`excluded.adj_close`,
        provider: sql`excluded.provider`,
      },
    });
  return rows.length;
}

/** The latest stored daily bar per symbol (YYYY-MM-DD), for incremental backfill. */
export async function latestCandleDates(
  symbols: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const db = getDb();
  if (!db || symbols.length === 0) return out;
  const rows = await db
    .select({
      symbol: candlesDaily.symbol,
      last: sql<string>`max(${candlesDaily.date})`,
    })
    .from(candlesDaily)
    .where(
      inArray(
        candlesDaily.symbol,
        symbols.map((s) => s.toUpperCase()),
      ),
    )
    .groupBy(candlesDaily.symbol);
  for (const r of rows) if (r.last) out.set(r.symbol, String(r.last).slice(0, 10));
  return out;
}
