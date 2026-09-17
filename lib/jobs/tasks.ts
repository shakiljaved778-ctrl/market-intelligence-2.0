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
  // Pull feeds (robots-checked), normalise, dedupe, store headline metadata —
  // never body text (§9 Stage 1, §10).
  const { ingestAll } = await import("@/lib/curation/ingest");
  const { loadSources } = await import("@/lib/curation/config");
  const { ensureSources, persistArticles } = await import("@/lib/db/queries/articles");

  const sources = loadSources();
  const result = await ingestAll(sources);
  const sourceMap = await ensureSources(sources);
  const stored = await persistArticles(result.articles, sourceMap);
  return { itemsIn: result.articles.length, itemsOut: stored };
}

export async function clusterTask(): Promise<JobSummary> {
  // Embed (local all-MiniLM in the runner), cluster within 48h, rank, persist
  // (§9 Stages 3–4). Reads recent articles from Postgres.
  const { dbRecentArticles, persistClusters } = await import(
    "@/lib/db/queries/articles"
  );
  const { runPipeline } = await import("@/lib/curation/pipeline");
  const { getEmbedder } = await import("@/lib/curation/embed");
  const { loadSources } = await import("@/lib/curation/config");

  const recent = await dbRecentArticles(48);
  if (recent.length === 0) return { itemsIn: 0, itemsOut: 0, outcome: "ok" };

  // Rank context: source tiers from the registry.
  const tiers: Record<string, string> = {};
  for (const s of loadSources()) tiers[s.id] = s.tier;

  // Live market moves feed the W_MARKET ranking term. We read them from the KV
  // cache the quotes job already primed (`market:quote:*`) — no new vendor call
  // here (§2). When keys/cache are absent this is simply empty and ranking falls
  // back to source-count/tier/recency, exactly as before.
  const { classify } = await import("@/lib/curation/classify");
  const { cacheGet } = await import("@/lib/cache/swr");
  const symbols = new Set<string>();
  for (const a of recent) {
    for (const t of classify(a.headline, a.dek).tickers) symbols.add(t);
  }
  const tickerMovePct: Record<string, number> = {};
  for (const symbol of symbols) {
    const q = await cacheGet<{ changePct?: number }>(`market:quote:${symbol}`);
    if (q && typeof q.changePct === "number") {
      tickerMovePct[symbol] = Math.abs(q.changePct);
    }
  }

  const ranked = await runPipeline(recent, { tiers, tickerMovePct }, getEmbedder());
  const stored = await persistClusters(ranked);

  // AI-written briefs (§13): generate an ORIGINAL body per cluster with Groq and
  // cache it under a stable key the read path consumes. Gated on GROQ_API_KEY —
  // a no-op without it — and needs KV configured in the runner so the brief
  // reaches the served site. Cached for a week (TTL.fundamentals) so each story
  // is generated once; never source text (§10).
  const { generateBrief, isGroqConfigured } = await import("@/lib/providers/groq");
  if (isGroqConfigured()) {
    const { classifySection } = await import("@/lib/curation/section");
    const dekById = new Map(recent.map((a) => [a.id, a.dek]));
    for (const c of ranked.slice(0, 24)) {
      const dek = dekById.get(c.primaryId) ?? null;
      const section = classifySection({
        title: c.title,
        dek,
        topics: c.topics,
        tickers: c.tickers,
      });
      const moves: Record<string, number> = {};
      for (const t of c.tickers) {
        const m = tickerMovePct[t];
        if (typeof m === "number") moves[t] = m;
      }
      const brief = await generateBrief(String(c.primaryId), {
        title: c.title,
        dek,
        section,
        tickers: c.tickers,
        sources: c.sourceIds,
        moves,
      });
      if (brief) await cachePut(`wire:brief:${c.primaryId}`, TTL.fundamentals, brief);
    }
  }

  return { itemsIn: recent.length, itemsOut: stored };
}
