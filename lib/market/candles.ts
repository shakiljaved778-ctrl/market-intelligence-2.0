import { cacheGet, cachePut } from "@/lib/cache/swr";
import { TTL } from "@/lib/cache/ttl";
import { getRegistry, ProviderRegistry } from "@/lib/providers";
import { persistDailyCandles } from "@/lib/db/queries/candles";
import type { Candle, Range } from "@/lib/providers/types";

/**
 * Candle refresh for the scheduled jobs (§6). Fetches via the registry, caches,
 * and persists daily bars to Postgres. Pages read the result via `readCandles`
 * and never trigger this path themselves.
 *
 * The job always asks the provider (it runs once a day, inside the free
 * budget) rather than going through stale-while-revalidate: an SWR read would
 * hand back yesterday's cached series — or a cached EMPTY series from before a
 * provider was configured — and refresh only in the background, after the
 * function may already have ended. A failed or empty fetch never overwrites a
 * good cached series.
 */
export async function refreshCandles(
  symbol: string,
  range: Range,
  registry: ProviderRegistry = getRegistry(),
): Promise<Candle[]> {
  const sym = symbol.toUpperCase();
  const w = range === "1D" || range === "5D";
  const ttl = w ? TTL.candlesIntraday : TTL.candlesDaily;
  const key = `market:candles:${sym}:${range}`;
  // Cached WITH the provider id so a series can always state its source.
  const res = await registry.candlesWithSource(sym, range);
  if (!res || res.candles.length === 0) {
    const cached = await cacheGet<{ candles: Candle[]; provider: string }>(key);
    return cached && Array.isArray(cached.candles) ? cached.candles : [];
  }
  await cachePut(key, ttl, res);
  if (!w) await persistDailyCandles(sym, res.candles, res.provider || null);
  return res.candles;
}
