import { getDb } from "@/lib/db/client";
import { instruments, quotes } from "@/lib/db/schema";
import type { Quote } from "@/lib/providers/types";

/**
 * Persist a fetched quote to Postgres (§6: quotes are written to KV + Postgres
 * on a schedule, then served from cache). Ensures the instrument row exists to
 * satisfy the foreign key, then records a point-in-time quote. No-op with no DB.
 */
export async function persistQuote(q: Quote): Promise<void> {
  const db = getDb();
  if (!db) return;

  await db
    .insert(instruments)
    .values({
      symbol: q.symbol,
      name: q.symbol,
      assetClass: q.nativeCurrency === "USD" ? "equity" : "equity",
      nativeCurrency: q.nativeCurrency,
      dataDelayMinutes: q.dataDelayMinutes,
    })
    .onConflictDoNothing();

  await db
    .insert(quotes)
    .values({
      symbol: q.symbol,
      ts: new Date(q.asOf),
      priceUsd: q.priceUsd,
      nativePrice: q.nativePrice,
      fxRateUsed: q.fxRateUsed,
      change: q.change,
      changePct: q.changePct,
      open: q.open,
      high: q.high,
      low: q.low,
      prevClose: q.prevClose,
      volume: q.volume,
      marketCapUsd: q.marketCapUsd,
      provider: q.provider,
    })
    .onConflictDoNothing();
}
