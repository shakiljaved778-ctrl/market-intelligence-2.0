import { swr } from "@/lib/cache/swr";
import { TTL } from "@/lib/cache/ttl";
import { getRegistry, ProviderRegistry } from "@/lib/providers";
import { persistDailyCandles } from "@/lib/db/queries/candles";
import type { Candle, Range } from "@/lib/providers/types";

/**
 * Candle refresh for the scheduled jobs (§6). Fetches via the registry, caches,
 * and persists daily bars to Postgres. Pages read the result via `readCandles`
 * and never trigger this path themselves.
 */
export async function refreshCandles(
  symbol: string,
  range: Range,
  registry: ProviderRegistry = getRegistry(),
): Promise<Candle[]> {
  const sym = symbol.toUpperCase();
  const w = range === "1D" || range === "5D";
  const ttl = w ? TTL.candlesIntraday : TTL.candlesDaily;
  // Cached WITH the provider id so a series can always state its source.
  const { value } = await swr(`market:candles:${sym}:${range}`, ttl, async () => {
    const res = await registry.candlesWithSource(sym, range);
    return res ?? { candles: [] as Candle[], provider: "" };
  });
  if (value.candles.length > 0 && !w) {
    await persistDailyCandles(sym, value.candles, value.provider || null);
  }
  return value.candles;
}
