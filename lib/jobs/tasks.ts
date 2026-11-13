import { INSTRUMENTS } from "@/content/instruments";
import { fredSeries } from "@/lib/providers/fred";
import { referenceRates } from "@/lib/providers/frankfurter";
import { worldBankSeries } from "@/lib/providers/worldbank";
import { getRegistry } from "@/lib/providers";
import { cachePut } from "@/lib/cache/swr";
import { TTL } from "@/lib/cache/ttl";
import { dbLatestQuotesForJob, persistQuote } from "@/lib/db/queries/quotes";
import { persistFundamentals } from "@/lib/db/queries/fundamentals";
import { persistFxRates, persistRecap, persistSeries } from "@/lib/db/queries/market";
import { pruneRetention } from "@/lib/db/queries/retention";
import { SERIES } from "@/lib/economy/series";
import { refreshCandles } from "@/lib/market/candles";
import { FX_QUOTE_CURRENCIES } from "@/lib/market/levels";
import { buildSessionClose, nyDate, type SessionRow } from "@/lib/narrative/session";
import { BACKFILL_SYMBOLS, TRACKED_SYMBOLS } from "./tracked";
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
    // Only a REAL provider answer is stored. (The fixture provider is absent in
    // production; the guard keeps demo runs from writing to a real database.)
    if (quote && quote.provider !== "fixture") {
      // Last-known-good: a long-lived cache entry plus a Postgres row, each
      // carrying the quote's own source, time and delay.
      await cachePut(`market:quote:${quote.symbol}`, TTL.quoteLastKnown, quote);
      await persistQuote(quote);
      out += 1;
    }
  }
  return { itemsIn: TRACKED_SYMBOLS.length, itemsOut: out };
}

/**
 * Macro job: FRED + World Bank series (macro tiles, yield curve, energy
 * benchmarks) and ECB reference FX rates. Everything fetched is PERSISTED so the
 * pages read stored, source-stamped observations — never a fixture.
 */
export async function macroTask(): Promise<JobSummary> {
  let out = 0;
  for (const cfg of SERIES) {
    const obs =
      cfg.provider === "fred"
        ? await fredSeries(cfg.code, cfg.historyDays)
        : await worldBankSeries(cfg.country ?? "", cfg.code);
    if (obs.length === 0) continue;
    await persistSeries(
      {
        id: cfg.id,
        name: cfg.name,
        unit: cfg.unit,
        frequency: cfg.frequency,
        source: cfg.source,
        region: cfg.region,
      },
      // World Bank dates are years ("2024"); store them as a year-end date.
      obs.map((o) => ({
        date: /^\d{4}$/.test(o.date) ? `${o.date}-12-31` : o.date,
        value: o.value,
      })),
    );
    out += 1;
  }

  const fx = await referenceRates("USD", FX_QUOTE_CURRENCIES, 14);
  const fxStored = await persistFxRates(fx.map((r) => ({ ...r, source: "ecb" })));

  return {
    itemsIn: SERIES.length + FX_QUOTE_CURRENCIES.length,
    itemsOut: out + (fxStored > 0 ? FX_QUOTE_CURRENCIES.length : 0),
  };
}

/**
 * Build and persist the US session-close recap from the quotes just stored.
 * Returns false (and writes nothing) when coverage is below the gate.
 */
async function sessionRecapTask(): Promise<boolean> {
  const stored = await dbLatestQuotesForJob(36);
  const rows: SessionRow[] = [];
  for (const inst of INSTRUMENTS) {
    const quote = stored.get(inst.symbol);
    if (quote) rows.push({ instrument: inst, quote });
  }
  // Normally the session is today's (New York). If this run fired late — after
  // midnight in New York — the closes it holds belong to the previous day.
  const today = nyDate(new Date().toISOString());
  const yesterday = nyDate(new Date(Date.now() - 86_400_000).toISOString());
  const result = buildSessionClose(rows, today) ?? buildSessionClose(rows, yesterday);
  if (!result) {
    console.log("[eod] session recap not published: closing-price coverage below gate");
    return false;
  }
  await persistRecap({
    slug: result.slug,
    kind: "session_close",
    bodyMd: result.output.bodyMd,
    templateVersion: result.output.templateVersion,
    inputs: {
      recap: result.output.inputs,
      coverage: result.coverage,
      sources: result.sources,
    },
  });
  return true;
}

export async function eodTask(): Promise<JobSummary> {
  // Refresh quotes first: at 22:00 UTC the US cash session has closed, so the
  // provider returns closing prices — the inputs the recap is built from.
  const quotes = await quotesTask();

  // The recap comes straight after the quotes it is built from, BEFORE the
  // slower candle and fundamentals steps, so a tight function time limit can
  // never leave the day without one.
  let recapWritten = false;
  try {
    recapWritten = await sessionRecapTask();
  } catch (err) {
    console.error("[eod] session recap failed:", err);
  }

  // EOD candle backfill for the core symbols across the daily ranges (§13).
  // Scoped to BACKFILL_SYMBOLS, not the full live-quote list, to stay within the
  // tight free candle budgets (Polygon ~5/min, EODHD ~100/day).
  let backfilled = 0;
  for (const symbol of BACKFILL_SYMBOLS) {
    for (const range of BACKFILL_RANGES) {
      const candles = await refreshCandles(symbol, range);
      if (candles.length > 0) backfilled += 1;
    }
  }
  // Refresh fundamentals for the core symbols (§6): low-frequency (daily) and
  // FMP-only, so it stays well within FMP's ~250/day free budget. Cached +
  // persisted; the quote page reads from cache, never the vendor (§2).
  const registry = getRegistry();
  let fundamentalsOut = 0;
  for (const symbol of BACKFILL_SYMBOLS) {
    const f = await registry.fundamentals(symbol);
    if (f && f.provider !== "fixture") {
      await cachePut(`market:fundamentals:${f.symbol}`, TTL.fundamentals, f);
      await persistFundamentals(f);
      fundamentalsOut += 1;
    }
  }

  const pruned = await pruneRetention();
  return {
    itemsOut:
      (quotes.itemsOut ?? 0) +
      backfilled +
      fundamentalsOut +
      (recapWritten ? 1 : 0) +
      pruned.articlesDeleted +
      pruned.intradayCandlesDeleted,
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
    const top = ranked.slice(0, 48);
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
        // Every clustered report's dek — more cited facts for the model to
        // synthesise a full 2–3 paragraph brief (never copied; §10).
        const sourceDeks = c.articleIds
          .map((id) => dekById.get(id))
          .filter((d): d is string => Boolean(d && d.trim()));
        const brief = await generateBrief(String(c.primaryId), {
          title: c.title,
          dek,
          section,
          tickers: c.tickers,
          sources: c.sourceIds,
          moves,
          sourceDeks,
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
