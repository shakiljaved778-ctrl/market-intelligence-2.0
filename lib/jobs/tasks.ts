import { fredSeries } from "@/lib/providers/fred";
import { getRegistry } from "@/lib/providers";
import { cachePut } from "@/lib/cache/swr";
import { TTL } from "@/lib/cache/ttl";
import { persistQuote } from "@/lib/db/queries/quotes";
import { pruneRetention } from "@/lib/db/queries/retention";
import { refreshCandles } from "@/lib/market/candles";
import { TRACKED_MACRO_SERIES, TRACKED_SYMBOLS } from "./tracked";
import type { JobSummary } from "./job-runs";

/**
 * The scheduled tasks (§3). Quotes/macro/eod refresh caches + Postgres in
 * batches so page requests are always served from cache and never call a
 * vendor. Ingest/cluster do the heavy curation work in the Actions runner —
 * their engines land in Phase 4.
 */

// Daily ranges backfilled by the EOD job (intraday stays cache-only).
const BACKFILL_RANGES = ["1M", "6M", "1Y", "5Y"] as const;

export async function quotesTask(): Promise<JobSummary> {
  const registry = getRegistry();
  let out = 0;
  for (const symbol of TRACKED_SYMBOLS) {
    const quote = await registry.quote(symbol);
    if (quote) {
      // Prime the read cache that pages consume, and persist to Postgres.
      await cachePut(`market:quote:${quote.symbol}`, TTL.quoteLive, quote);
      await persistQuote(quote);
      out += 1;
    }
  }
  return { itemsIn: TRACKED_SYMBOLS.length, itemsOut: out };
}

export async function macroTask(): Promise<JobSummary> {
  let out = 0;
  for (const series of TRACKED_MACRO_SERIES) {
    const obs = await fredSeries(series);
    if (obs.length > 0) out += 1;
  }
  return { itemsIn: TRACKED_MACRO_SERIES.length, itemsOut: out };
}

export async function eodTask(): Promise<JobSummary> {
  // EOD candle backfill for tracked symbols across the daily ranges (§13).
  let backfilled = 0;
  for (const symbol of TRACKED_SYMBOLS) {
    for (const range of BACKFILL_RANGES) {
      const candles = await refreshCandles(symbol, range);
      if (candles.length > 0) backfilled += 1;
    }
  }
  const pruned = await pruneRetention();
  return {
    itemsOut: backfilled + pruned.articlesDeleted + pruned.intradayCandlesDeleted,
    outcome: pruned.skipped ? "partial" : "ok",
  };
}

export async function ingestTask(): Promise<JobSummary> {
  // Phase 4 fills this: pull feeds, dedupe, classify, store (no body text).
  return { itemsIn: 0, itemsOut: 0, outcome: "ok" };
}

export async function clusterTask(): Promise<JobSummary> {
  // Phase 4 fills this: embed, cluster, rank, generate computed recaps.
  return { itemsIn: 0, itemsOut: 0, outcome: "ok" };
}
