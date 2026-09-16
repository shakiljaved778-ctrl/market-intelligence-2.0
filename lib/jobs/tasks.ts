import { fredSeries } from "@/lib/providers/fred";
import { getRegistry } from "@/lib/providers";
import { persistQuote } from "@/lib/db/queries/quotes";
import { pruneRetention } from "@/lib/db/queries/retention";
import { TRACKED_MACRO_SERIES, TRACKED_SYMBOLS } from "./tracked";
import type { JobSummary } from "./job-runs";

/**
 * The scheduled tasks (§3). Quotes/macro refresh caches and Postgres in batches
 * so page requests are always served from cache. Ingest/cluster do the heavy
 * curation work in the Actions runner — their engines land in Phase 4, so here
 * they are wired as no-op-safe entrypoints that still log a job_runs row.
 */

export async function quotesTask(): Promise<JobSummary> {
  const registry = getRegistry();
  let out = 0;
  for (const symbol of TRACKED_SYMBOLS) {
    const quote = await registry.quote(symbol);
    if (quote) {
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
  const pruned = await pruneRetention();
  return {
    itemsOut: pruned.articlesDeleted + pruned.intradayCandlesDeleted,
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
