import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { dbRead, getDb } from "@/lib/db/client";
import { candlesDaily, instruments, quotes } from "@/lib/db/schema";
import { rangeToWindow, ymd } from "@/lib/providers/range";
import type { Candle, Quote, Range } from "@/lib/providers/types";

/**
 * Read-only DB accessors for page rendering (§6 budget discipline): pages read
 * what the scheduled jobs persisted — they never call a vendor. Every function
 * returns null/[] when there is no database.
 */

export async function dbLatestQuote(symbol: string): Promise<Quote | null> {
  return dbRead("dbLatestQuote", async () => {
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
      // The delay recorded WITH the quote wins; older rows fall back to the
      // instrument's declared delay.
      dataDelayMinutes: row.delayMinutes ?? inst?.dataDelayMinutes ?? 0,
      asOf: row.ts.toISOString(),
    };
  });
}

export interface StoredSeries {
  candles: Candle[];
  /** Provider that supplied the bars, when recorded. */
  provider: string | null;
}

export async function dbCandles(symbol: string, range: Range): Promise<StoredSeries> {
  return dbRead("dbCandles", async () => {
    const db = getDb();
    if (!db) return { candles: [], provider: null };
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
    const provider = rows.at(-1)?.provider ?? null;
    return {
      provider,
      candles: rows.map(
        (r): Candle => ({
          t: new Date(`${r.date}T00:00:00.000Z`).toISOString(),
          o: r.o,
          h: r.h,
          l: r.l,
          c: r.c,
          v: r.v,
        }),
      ),
    };
  });
}

/** Recent daily closes for many symbols in ONE query (screener trend column). */
export async function dbRecentCloses(
  symbols: string[],
  days = 45,
): Promise<Map<string, number[]>> {
  return dbRead("dbRecentCloses", async () => {
    const out = new Map<string, number[]>();
    const db = getDb();
    if (!db || symbols.length === 0) return out;
    const since = ymd(new Date(Date.now() - days * 86_400_000));
    const rows = await db
      .select({
        symbol: candlesDaily.symbol,
        date: candlesDaily.date,
        c: candlesDaily.c,
      })
      .from(candlesDaily)
      .where(
        and(
          inArray(
            candlesDaily.symbol,
            symbols.map((s) => s.toUpperCase()),
          ),
          gte(candlesDaily.date, since),
        ),
      )
      .orderBy(candlesDaily.symbol, candlesDaily.date);
    for (const r of rows) out.set(r.symbol, [...(out.get(r.symbol) ?? []), r.c]);
    return out;
  });
}
