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

  // Enrich clusters (§13): an AI brief (Groq) and a cover photo (Pexels), each
  // gated on its own key and only for clusters that don't already have one, so a
  // story costs at most one call per provider. Both are persisted on the cluster
  // row (URL/attribution + synthesised prose only — never source text, §10).
  const { generateBrief, isGroqConfigured } = await import("@/lib/providers/groq");
  const { searchPexels, isPexelsConfigured } = await import("@/lib/providers/pexels");
  if (isGroqConfigured() || isPexelsConfigured()) {
    const { classifySection } = await import("@/lib/curation/section");
    const { coverQuery } = await import("@/lib/news/cover-query");
    const {
      existingClusterBriefs,
      setClusterBrief,
      existingClusterCovers,
      setClusterCover,
    } = await import("@/lib/db/queries/articles");
    const top = ranked.slice(0, 24);
    const slugs = top.map((c) => c.slug);
    const empty = new Set<string>();
    const [haveBrief, haveCover] = await Promise.all([
      isGroqConfigured() ? existingClusterBriefs(slugs) : Promise.resolve(empty),
      isPexelsConfigured() ? existingClusterCovers(slugs) : Promise.resolve(empty),
    ]);
    const dekById = new Map(recent.map((a) => [a.id, a.dek]));
    let briefsWritten = 0;
    let coversWritten = 0;
    for (const c of top) {
      const dek = dekById.get(c.primaryId) ?? null;
      const section = classifySection({
        title: c.title,
        dek,
        topics: c.topics,
        tickers: c.tickers,
      });

      if (isGroqConfigured() && !haveBrief.has(c.slug)) {
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
        if (brief) {
          await setClusterBrief(c.slug, brief.body, brief.model);
          briefsWritten += 1;
        }
      }

      if (isPexelsConfigured() && !haveCover.has(c.slug)) {
        const extra =
          c.entities[0] ?? c.tickers[0] ?? c.topics[0]?.replace(/_/g, " ") ?? "";
        const cover = await searchPexels(coverQuery(section, extra));
        if (cover) {
          await setClusterCover(c.slug, cover.url, cover.credit, cover.creditUrl);
          coversWritten += 1;
        }
      }
    }
    console.log(
      `[cluster] enrich: ${briefsWritten} briefs, ${coversWritten} covers written`,
    );
  }

  return { itemsIn: recent.length, itemsOut: stored };
}
