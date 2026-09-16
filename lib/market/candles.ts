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
  const { value } = await swr(`market:candles:${sym}:${range}`, ttl, () =>
    registry.candles(sym, range),
  );
  if (value.length > 0 && !w) {
    await persistDailyCandles(sym, value);
  }
  return value;
}
