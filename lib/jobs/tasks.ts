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
import { latestCandleDates } from "@/lib/db/queries/candles";
import { BACKFILL_SYMBOLS, TRACKED_SYMBOLS, historySymbols } from "./tracked";
import type { JobSummary } from "./job-runs";

/**
 * The scheduled tasks (§3). Quotes/macro/eod refresh caches + Postgres in
 * batches so page requests are always served from cache and never call a
 * vendor. Ingest/cluster do the heavy curation work in the Actions runner —
 * their engines land in Phase 4.
 */

/**
 * Daily price history (owner request, 2026-11-19: "include stock prices
 * historical figures"). The EOD job keeps `candles_daily` current for every
 * tracked US equity: a symbol with recent stored bars fetches only the last
 * month (one small call), and a symbol with none — or a gap — fetches five
 * years, at most `FULL_HISTORY_PER_RUN` a run so the job stays inside the
 * route's 60 s limit and FMP's free ~250 calls a day. Every range on the quote
 * page (1M … 5Y) is then read from the stored bars.
 */
export const FULL_HISTORY_PER_RUN = 12;
/** Stored bars newer than this many days count as current (weekends, holidays). */
export const HISTORY_FRESH_DAYS = 10;

/** Which symbols fetch five years and which only the last month, this run. */
export function planHistoryRefresh(
  symbols: readonly string[],
  latest: ReadonlyMap<string, string>,
  now: Date = new Date(),
  fullPerRun: number = FULL_HISTORY_PER_RUN,
): { full: string[]; recent: string[] } {
  const full: string[] = [];
  const recent: string[] = [];
  const freshSince = now.getTime() - HISTORY_FRESH_DAYS * 86_400_000;
  for (const raw of symbols) {
    const sym = raw.toUpperCase();
    const last = latest.get(sym);
    const lastMs = last ? Date.parse(`${last}T00:00:00Z`) : NaN;
    if (Number.isFinite(lastMs) && lastMs >= freshSince) recent.push(sym);
    else if (full.length < fullPerRun) full.push(sym);
  }
  return { full, recent };
}

/** Short, older-format briefs rewritten per cluster run (Groq free tier). */
export const BRIEF_REWRITES_PER_RUN = 8;
/**
 * Most Groq articles written per cluster run, new and rewritten together. With
 * calls spaced 20 s apart for the free tier's token limit, this keeps a run to
 * about five minutes; stories left over are written on the next run.
 */
export const BRIEF_CALLS_PER_RUN = 15;

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
/**
 * Time the macro job spends on series before it stops starting new ones, so the
 * whole run (series, then FX, each request capped by PROVIDER_TIMEOUT_MS) ends
 * inside the route's 60 s limit. Series left out are fetched on the next run.
 */
export const MACRO_SERIES_BUDGET_MS = 35_000;

/** Extra cover photos per cluster run for Gulf stories outside the top slice. */
export const GCC_COVERS_PER_RUN = 12;
/** Extra illustrative photos on a story page, beside its cover (owner request, 2026-11-19). */
export const GALLERY_SIZE = 2;
/** Stories that already have a cover get their gallery a few per run. */
export const GALLERY_BACKFILL_PER_RUN = 12;

export async function macroTask(): Promise<JobSummary> {
  let out = 0;
  const started = Date.now();
  // Start at a different series each run (rotating every hour), so when the
  // time budget cuts a run short it is never the same series that waits.
  const shift = Math.floor(started / 3_600_000) % SERIES.length;
  const ordered = [...SERIES.slice(shift), ...SERIES.slice(0, shift)];
  for (const cfg of ordered) {
    if (Date.now() - started > MACRO_SERIES_BUDGET_MS) {
      console.warn(
        `[macro] time budget reached; ${cfg.id} and later series wait for the next run`,
      );
      break;
    }
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

  // Daily price history for every tracked equity (see planHistoryRefresh).
  // Core symbols go first so they are never the ones waiting for a full fill.
  let backfilled = 0;
  let historyPlan = { full: 0, recent: 0 };
  try {
    const symbols = historySymbols();
    const plan = planHistoryRefresh(symbols, await latestCandleDates(symbols));
    historyPlan = { full: plan.full.length, recent: plan.recent.length };
    for (const symbol of plan.full) {
      if ((await refreshCandles(symbol, "5Y")).length > 0) backfilled += 1;
    }
    for (const symbol of plan.recent) {
      if ((await refreshCandles(symbol, "1M")).length > 0) backfilled += 1;
    }
    console.log(
      `[eod] history: ${plan.full.length} full, ${plan.recent.length} recent, ${backfilled} stored`,
    );
  } catch (err) {
    console.error("[eod] price history refresh failed:", err);
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
    detail: {
      historyFull: historyPlan.full,
      historyRecent: historyPlan.recent,
      historyStored: backfilled,
      historyHttp: (await import("@/lib/providers/fmp")).fmpHistoryStatus,
    },
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

  // Stored articles that fall under the editorial exclusions (stored before the
  // rule existed) are never clustered, ranked or written up.
  const { isExcluded } = await import("@/lib/curation/exclusions");
  const regionOf = new Map(loadSources().map((s) => [s.id, s.region ?? null]));
  const recent = (await dbRecentArticles(48)).filter(
    (a) =>
      !isExcluded({
        texts: [a.headline, a.dek],
        sourceRegion: regionOf.get(a.sourceId) ?? null,
      }),
  );
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
  const { generateBrief, isGroqConfigured, BRIEF_MIN_WORDS, BRIEF_FORMAT } =
    await import("@/lib/providers/groq");
  const { searchPexelsPhotos, isPexelsConfigured } = await import(
    "@/lib/providers/pexels"
  );
  if (isGroqConfigured() || isPexelsConfigured()) {
    const { classifySection, sectionMeta } = await import("@/lib/curation/section");
    // Stories in a hidden section (the "general" bucket) are never shown, so
    // they get no article and no cover — the free-tier budget goes to stories
    // readers can see.
    const shown = (section: string) => !sectionMeta(section).hidden;
    const { coverQuery, gccPlace } = await import("@/lib/news/cover-query");
    const { classifyRegion } = await import("@/lib/curation/region");
    const {
      existingClusterBriefs,
      clustersNeedingBrief,
      setClusterBrief,
      existingClusterCovers,
      setClusterCover,
      setClusterGallery,
      clustersNeedingGallery,
      dedupeRecentCovers,
    } = await import("@/lib/db/queries/articles");
    // No photo twice across recent stories: clear repeats first (they are
    // re-covered below), and never pick a photo another story already has.
    const covers = isPexelsConfigured()
      ? await dedupeRecentCovers()
      : { inUse: new Set<string>(), cleared: 0 };
    const usedCovers = covers.inUse;
    if (covers.cleared > 0) {
      console.log(`[cluster] cleared ${covers.cleared} repeated cover photos`);
    }
    // A cover plus GALLERY_SIZE more photos from the same (cached) search, none
    // already on another recent story. Returns whether a cover was written.
    const writeCover = async (slug: string, query: string): Promise<boolean> => {
      const photos = await searchPexelsPhotos(
        query,
        slug,
        usedCovers,
        1 + GALLERY_SIZE,
      );
      const [cover, ...gallery] = photos;
      if (!cover) return false;
      await setClusterCover(slug, cover.url, cover.credit, cover.creditUrl, gallery);
      for (const p of photos) usedCovers.add(p.url);
      return true;
    };
    const top = ranked.slice(0, 48);
    const slugs = top.map((c) => c.slug);
    const [haveBrief, haveCover] = await Promise.all([
      isGroqConfigured()
        ? existingClusterBriefs(slugs)
        : Promise.resolve(
            new Map<
              string,
              { words: number; model: string | null; mentionsExcluded: boolean }
            >(),
          ),
      isPexelsConfigured()
        ? existingClusterCovers(slugs)
        : Promise.resolve(new Set<string>()),
    ]);
    // Articles that are short or written under older rules (BRIEF_FORMAT) are
    // rewritten a few per run, so the free-tier rate limit is respected.
    let rewritesLeft = BRIEF_REWRITES_PER_RUN;
    let callsLeft = BRIEF_CALLS_PER_RUN;
    const sourceName = new Map(loadSources().map((s) => [s.id, s.name]));
    const dekById = new Map(recent.map((a) => [a.id, a.dek]));
    const sourceById = new Map(recent.map((a) => [a.id, a.sourceId]));
    // A story's Gulf country or "GCC" (lib/curation/region.ts): its text, then
    // its primary source's registered region.
    const regionOfCluster = (c: (typeof ranked)[number], dek: string | null) =>
      classifyRegion({
        title: c.title,
        dek,
        sourceRegion: regionOf.get(sourceById.get(c.primaryId) ?? "") ?? null,
      });
    let briefsWritten = 0;
    let coversWritten = 0;
    for (const c of top) {
      const dek = dekById.get(c.primaryId) ?? null;
      const section = classifySection({
        title: c.title,
        dek,
        topics: c.topics,
        tickers: c.tickers,
        sourceId: sourceById.get(c.primaryId) ?? null,
      });
      if (!shown(section)) continue;

      const stored = haveBrief.get(c.slug);
      const needsBrief = stored === undefined;
      // Rewrite articles that are short or were written under older rules.
      // An article naming an editorially excluded term (written before the
      // rule existed) is hidden at read time, so it is rewritten too.
      const outdated =
        stored !== undefined &&
        (stored.words < BRIEF_MIN_WORDS ||
          !stored.model?.endsWith(`#${BRIEF_FORMAT}`) ||
          stored.mentionsExcluded);
      const needsRewrite = outdated && rewritesLeft > 0;
      if (isGroqConfigured() && (needsBrief || needsRewrite) && callsLeft > 0) {
        callsLeft -= 1;
        if (needsRewrite) rewritesLeft -= 1;
        const moves: Record<string, number> = {};
        for (const t of c.tickers) {
          const m = tickerMovePct[t];
          if (typeof m === "number") moves[t] = m;
        }
        // Every clustered report's dek — more cited facts for the model to
        // synthesise a full, sectioned article (never copied; §10).
        const sourceDeks = c.articleIds
          .map((id) => dekById.get(id))
          .filter((d): d is string => Boolean(d && d.trim()));
        const brief = await generateBrief(String(c.primaryId), {
          title: c.title,
          dek,
          section,
          tickers: c.tickers,
          // Names, not ids: the article credits "Qatar News Agency", never
          // "qna-economy-local".
          sources: c.sourceIds.map((id) => sourceName.get(id) ?? id),
          moves,
          sourceDeks,
          publishedAt: c.eventTime,
        });
        if (brief) {
          await setClusterBrief(c.slug, brief.body, `${brief.model}#${BRIEF_FORMAT}`);
          briefsWritten += 1;
        }
      }

      if (isPexelsConfigured() && !haveCover.has(c.slug)) {
        const extra =
          gccPlace(regionOfCluster(c, dek)) ??
          c.entities[0] ??
          c.tickers[0] ??
          c.topics[0]?.replace(/_/g, " ") ??
          "";
        if (await writeCover(c.slug, coverQuery(section, extra))) coversWritten += 1;
      }
    }
    // Gulf stories ranked below the top slice still lead the homepage's GCC
    // band, so they get a cover photo too — a few per run (owner request,
    // 2026-11-19: image-led homepage). Hidden-section stories are skipped.
    if (isPexelsConfigured()) {
      const gulf = ranked.slice(top.length).filter((c) => {
        const dek = dekById.get(c.primaryId) ?? null;
        const section = classifySection({
          title: c.title,
          dek,
          topics: c.topics,
          tickers: c.tickers,
          sourceId: sourceById.get(c.primaryId) ?? null,
        });
        return shown(section) && gccPlace(regionOfCluster(c, dek)) !== null;
      });
      const haveGulfCover = await existingClusterCovers(gulf.map((c) => c.slug));
      let gulfCoversLeft = GCC_COVERS_PER_RUN;
      for (const c of gulf) {
        if (gulfCoversLeft <= 0) break;
        if (haveGulfCover.has(c.slug)) continue;
        gulfCoversLeft -= 1;
        const dek = dekById.get(c.primaryId) ?? null;
        const section = classifySection({
          title: c.title,
          dek,
          topics: c.topics,
          tickers: c.tickers,
          sourceId: sourceById.get(c.primaryId) ?? null,
        });
        if (
          await writeCover(
            c.slug,
            coverQuery(section, gccPlace(regionOfCluster(c, dek))),
          )
        )
          coversWritten += 1;
      }
    }
    // Stories that already had a cover before galleries existed get their extra
    // photos a few per run, from the same search their cover came from.
    let galleriesWritten = 0;
    if (isPexelsConfigured()) {
      const needGallery = await clustersNeedingGallery(slugs);
      let left = GALLERY_BACKFILL_PER_RUN;
      for (const c of top) {
        if (left <= 0) break;
        if (!needGallery.has(c.slug)) continue;
        const dek = dekById.get(c.primaryId) ?? null;
        const section = classifySection({
          title: c.title,
          dek,
          topics: c.topics,
          tickers: c.tickers,
          sourceId: sourceById.get(c.primaryId) ?? null,
        });
        if (!shown(section)) continue;
        left -= 1;
        const extra =
          gccPlace(regionOfCluster(c, dek)) ??
          c.entities[0] ??
          c.tickers[0] ??
          c.topics[0]?.replace(/_/g, " ") ??
          "";
        const gallery = await searchPexelsPhotos(
          coverQuery(section, extra),
          c.slug,
          usedCovers,
          GALLERY_SIZE,
        );
        if (gallery.length > 0) {
          await setClusterGallery(c.slug, gallery);
          for (const p of gallery) usedCovers.add(p.url);
          galleriesWritten += 1;
        }
      }
    }
    // Spare calls go to published stories that still have no article (they
    // missed their run, or lost it when a later run split them), newest first.
    let backfilled = 0;
    if (isGroqConfigured() && callsLeft > 0) {
      // Read extra candidates: hidden-section stories are skipped, not written.
      for (const b of await clustersNeedingBrief(callsLeft * 4)) {
        if (callsLeft <= 0) break;
        const section = classifySection({
          title: b.title,
          dek: b.primaryDek,
          topics: b.primaryTopic ? [b.primaryTopic] : [],
          tickers: b.tickers,
          sourceId: b.sourceSlugs[0] ?? null,
        });
        if (!shown(section)) continue;
        if (
          isExcluded({
            texts: [b.title, b.primaryDek, ...b.deks],
            sourceRegion: regionOf.get(b.sourceSlugs[0] ?? "") ?? null,
          })
        )
          continue;
        callsLeft -= 1;
        const brief = await generateBrief(String(b.primaryArticleId), {
          title: b.title,
          dek: b.primaryDek,
          section,
          tickers: b.tickers,
          sources: b.sourceSlugs.map((id) => sourceName.get(id) ?? id),
          sourceDeks: b.deks,
          publishedAt: b.eventTime.toISOString(),
        });
        if (brief) {
          await setClusterBrief(b.slug, brief.body, `${brief.model}#${BRIEF_FORMAT}`);
          backfilled += 1;
        }
      }
    }
    console.log(
      `[cluster] enrich: ${briefsWritten} briefs, ${backfilled} backfilled, ${coversWritten} covers, ${galleriesWritten} galleries written`,
    );
  }

  return { itemsIn: recent.length, itemsOut: stored };
}
