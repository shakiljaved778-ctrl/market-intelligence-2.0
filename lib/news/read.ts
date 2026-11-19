import { cache } from "react";
import { EDITORIAL_ARTICLES, isEditorialCurrent } from "@/content/editorial";
import {
  eurekaArticles,
  eurekaBody,
  type ArticleBody,
  type RawArticle,
} from "@/lib/content/authored";
import { demo } from "@/lib/demo/fixtures";
import { isDemoMode } from "@/lib/demo/mode";
import { isDbConfigured } from "@/lib/db/client";
import { dbReadWire, dbReadWireBySlug, type DbWireRow } from "@/lib/db/queries/wire";
import { classify } from "@/lib/curation/classify";
import { HashEmbedder } from "@/lib/curation/embed";
import { demoNow, shiftFixtureDate } from "@/lib/demo/clock";
import { titleSimilarity, DEFAULT_JACCARD_THRESHOLD } from "@/lib/curation/dedupe";
import { runPipeline, type SluggedCluster } from "@/lib/curation/pipeline";
import { computeImportance, type RankContext } from "@/lib/curation/rank";
import { loadSources } from "@/lib/curation/config";
import { excludedTermsIn, isExcluded } from "@/lib/curation/exclusions";
import { classifyRegion, type Region } from "@/lib/curation/region";
import { getQuotes } from "@/lib/market/service";
import {
  classifySection,
  loadSections,
  sectionMeta,
  type SectionConfig,
} from "@/lib/curation/section";

/**
 * Read layer for the wire (§13). In production the cluster job persists ranked
 * clusters to Postgres and this reads them back (`dbReadWire`), merged with
 * Mizaan's own authored Eureka explainers. Invented demo news is reachable only
 * under DEMO_MODE=1 (see `loadAll`). Each cluster is tagged with a section
 * (deterministic, keyword-driven) and an optional image reference.
 */
/** A ranked cluster enriched with its editorial section + cover image. */
export interface WireCluster extends SluggedCluster {
  section: string;
  /** GCC country, "GCC", or "GLOBAL" (lib/curation/region.ts). */
  region: Region;
  dek: string | null;
  imageUrl: string | null;
  imageCredit: { credit: string; creditUrl: string } | null;
}

export interface ClusterMember {
  headline: string;
  sourceName: string;
  url: string;
  publishedAt: string;
  dek: string | null;
}

/** A cluster plus everything the detail view needs, computed once per request. */
interface LoadedCluster {
  cluster: WireCluster;
  members: ClusterMember[];
  primaryId: number;
  /** AI-written brief: fixtures carry demo bodies; live stories carry the Groq brief. */
  body: ArticleBody | null;
  /** Registered region of the primary report's source (content/sources.yaml). */
  sourceRegion: string | null;
}

function context(clock: Date, articles: RawArticle[]): RankContext {
  const tiers: Record<string, string> = {};
  for (const a of articles) tiers[a.sourceId] = a.tier;
  // Demo price moves feed the demo ranking only; in production this is empty
  // (authored explainers are not ranked on invented market moves).
  const tickerMovePct: Record<string, number> = {};
  for (const row of demo.universe()) {
    tickerMovePct[row.symbol] = Math.abs(row.changePct);
  }
  return { tiers, tickerMovePct, now: clock };
}

function toMember(a: RawArticle): ClusterMember {
  return {
    headline: a.headline,
    sourceName: a.sourceName,
    url: a.url,
    publishedAt: a.publishedAt,
    dek: a.dek,
  };
}

/** Enrich a fixture-computed cluster with section + cover + members. The
 * `byId` map carries the fixture articles (demo-shifted in zero-key mode) so
 * members report the same dates the cluster was ranked on. */
function fixtureLoaded(
  cluster: SluggedCluster,
  byId: Map<number, RawArticle>,
): LoadedCluster {
  const primary = byId.get(cluster.primaryId);
  const section = classifySection({
    title: cluster.title,
    dek: primary?.dek ?? null,
    topics: cluster.topics,
    tickers: cluster.tickers,
    sourceId: primary?.sourceId ?? null,
  });
  // Prefer a resolved cover (demo only); fall back to any image reference on
  // the article, else null → the UI draws the generated section cover.
  const cover = demo.cover(cluster.primaryId);
  const wire: WireCluster = {
    ...cluster,
    section,
    region: classifyRegion({
      title: cluster.title,
      dek: primary?.dek ?? null,
      sourceRegion: sourceRegion(primary?.sourceId),
    }),
    dek: primary?.dek ?? null,
    imageUrl: cover?.url ?? primary?.imageUrl ?? null,
    imageCredit: cover ? { credit: cover.credit, creditUrl: cover.creditUrl } : null,
  };
  const members = cluster.articleIds
    .map((id) => byId.get(id))
    .filter((a): a is RawArticle => Boolean(a))
    .sort(
      (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime(),
    )
    .map(toMember);
  return {
    cluster: wire,
    members,
    primaryId: cluster.primaryId,
    // Eureka explainers carry their authored body in every mode; demo news
    // bodies exist only under DEMO_MODE.
    body: eurekaBody(cluster.primaryId) ?? demo.articleBody(cluster.primaryId),
    sourceRegion: sourceRegion(primary?.sourceId),
  };
}

let sourceRegions: Map<string, string> | null = null;
/** The registered region of a source (content/sources.yaml), if any. */
function sourceRegion(sourceId: string | null | undefined): string | null {
  if (!sourceId) return null;
  if (!sourceRegions) {
    sourceRegions = new Map();
    for (const s of loadSources()) if (s.region) sourceRegions.set(s.id, s.region);
  }
  return sourceRegions.get(sourceId) ?? null;
}

/** Build a cluster from a persisted (live) row. Live articles carry no stored
 * image, so the UI draws the deterministic SVG cover. */
function dbLoaded(row: DbWireRow): LoadedCluster {
  // Tickers are RE-DERIVED at read time from the member headlines and deks with
  // the current matcher, rather than trusted from storage: rows written before
  // the matcher was tightened carry false tickers ("now" → NOW, "low" → LOW).
  const tickers = [
    ...new Set(row.members.flatMap((m) => classify(m.headline, m.dek).tickers)),
  ];
  const cluster: WireCluster = {
    slug: row.slug,
    title: row.title,
    tickers,
    topics: row.topics,
    entities: row.entities,
    sourceIds: row.sourceIds,
    sourceCount: row.sourceCount,
    eventTime: row.eventTime,
    importanceScore: row.importanceScore,
    articleIds: row.articleIds,
    primaryId: row.primaryId,
    section: classifySection({
      title: row.title,
      dek: row.primaryDek,
      topics: row.topics,
      tickers,
      sourceId: row.primarySourceId,
    }),
    region: classifyRegion({
      title: row.title,
      dek: row.primaryDek,
      sourceRegion: sourceRegion(row.primarySourceId),
    }),
    dek: row.primaryDek,
    imageUrl: row.imageUrl,
    imageCredit: row.imageCredit,
  };
  return {
    cluster,
    members: row.members,
    primaryId: row.primaryId,
    // An AI article that names an excluded term (content/exclusions.yaml — e.g.
    // a Qatar bank story whose background mentions the central bank) is not
    // shown; the story keeps its summary and the cluster job rewrites it.
    body:
      row.brief && excludedTermsIn(row.brief.md).length === 0
        ? { md: row.brief.md, model: row.brief.model }
        : null,
    sourceRegion: sourceRegion(row.primarySourceId),
  };
}

/**
 * Editorial exclusions (content/exclusions.yaml, owner decision 2026-11-19): no
 * Qatar Central Bank news and no Qatar politics. Ingest already drops these;
 * this hides any story stored before the rule existed, from every list, feed,
 * sitemap and story page. Checks the headline, dek and every clustered report.
 * (An AI article that names an excluded term is dropped in dbLoaded instead,
 * so a permitted story is not lost because of its generated background.)
 */
function isAllowedStory(l: LoadedCluster): boolean {
  const c = l.cluster;
  return !isExcluded({
    texts: [c.title, c.dek, ...l.members.flatMap((m) => [m.headline, m.dek])],
    sourceRegion: l.sourceRegion,
  });
}

/**
 * Collapse near-duplicate clusters on the live wire (Phase 2 §2): keep the first
 * of any same-section group whose titles are near-identical (token Jaccard ≥
 * threshold), dropping the rest so a paraphrase never appears as a second card.
 * Input is assumed importance-ranked, so the kept one is the stronger cluster.
 */
function collapseNearDuplicates(list: LoadedCluster[]): LoadedCluster[] {
  const kept: LoadedCluster[] = [];
  for (const l of list) {
    const dup = kept.some(
      (k) =>
        k.cluster.section === l.cluster.section &&
        titleSimilarity(k.cluster.title, l.cluster.title) >= DEFAULT_JACCARD_THRESHOLD,
    );
    if (!dup) kept.push(l);
  }
  return kept;
}

/** Rank a set of authored/demo articles into loaded clusters. */
async function rankAuthored(
  articles: RawArticle[],
  clock: Date,
): Promise<LoadedCluster[]> {
  if (articles.length === 0) return [];
  const byId = new Map<number, RawArticle>(articles.map((a) => [a.id, a]));
  const ranked = await runPipeline(
    articles.map((a) => ({
      id: a.id,
      sourceId: a.sourceId,
      trustScore: a.trustScore,
      headline: a.headline,
      dek: a.dek,
      publishedAt: a.publishedAt,
    })),
    context(clock, articles),
    new HashEmbedder(),
  );
  return ranked.map((c) => fixtureLoaded(c, byId));
}

/**
 * DEMO MODE ONLY: the full fixture wire, with every date shifted forward onto
 * the current demo window (lib/demo/clock.ts) and ranked against that clock, so
 * the demo always looks current. Returns [] outside demo mode.
 */
async function computeDemoWire(): Promise<LoadedCluster[]> {
  const fixtures = demo.articles();
  if (fixtures.length === 0) return [];
  const now = Date.now();
  return rankAuthored(
    fixtures.map((a) => ({ ...a, publishedAt: shiftFixtureDate(a.publishedAt, now) })),
    demoNow(now),
  );
}

/**
 * The evergreen Eureka explainers — authored, cited content served in every
 * mode. Ranked against the REAL clock with their authored dates, so they never
 * out-rank or masquerade as today's news.
 */
async function computeEurekaClusters(): Promise<LoadedCluster[]> {
  return (await rankAuthored(eurekaArticles(), new Date())).filter(
    (l) => l.cluster.section === "eureka",
  );
}

/**
 * A cluster is shown only when a reader actually gets an article: either an
 * AI-written article (a sectioned brief), OR a genuine dek — a real sentence, not a
 * government feed's description that just repeats the headline. Content-free
 * stubs (bare headline, no brief) are hidden until their brief is generated, so
 * the wire never shows a two-line "article". Applied to LIVE data only; the
 * authored fixtures all carry real deks, so the zero-key demo is unaffected.
 */
function isSubstantive(l: LoadedCluster): boolean {
  if (l.body && l.body.md.trim().length > 0) return true;
  const dek = l.cluster.dek?.trim() ?? "";
  const title = l.cluster.title.trim();
  if (!dek || dek.toLowerCase() === title.toLowerCase()) return false;
  const words = dek.split(/\s+/).filter(Boolean).length;
  return words >= 6 && dek.length >= 40;
}

/**
 * Owner-curated editorial stories (content/editorial.ts): real, cited items an
 * editor promotes into the wire. Ranked against the real clock like live news,
 * and dropped automatically once they pass their expiry (72 hours by default),
 * so a hand-picked story can never sit at the top for days.
 */
async function computeEditorialClusters(): Promise<LoadedCluster[]> {
  const current = EDITORIAL_ARTICLES.filter((a) => isEditorialCurrent(a));
  return rankAuthored(current, new Date());
}

/**
 * Recompute every live story's importance with the CURRENT clock (Phase 2).
 *
 * The score the cluster job stores is frozen the moment a story leaves the
 * 48-hour clustering window, so sorting on it kept weeks-old stories at the top
 * of the wire. Every input to the score is available at read time — source
 * count, source tiers, the instruments' current moves and the event time — so
 * the score is simply computed again here, and the recency decay is always
 * measured from now.
 */
async function rerankNow(list: LoadedCluster[]): Promise<LoadedCluster[]> {
  if (list.length === 0) return list;
  const tiers: Record<string, string> = {};
  for (const s of loadSources()) tiers[s.id] = s.tier;
  const symbols = [...new Set(list.flatMap((l) => l.cluster.tickers))];
  const tickerMovePct: Record<string, number> = {};
  if (symbols.length > 0) {
    for (const [symbol, p] of await getQuotes(symbols)) {
      if (p.value) tickerMovePct[symbol] = Math.abs(p.value.changePct);
    }
  }
  const ctx: RankContext = { tiers, tickerMovePct, now: new Date() };
  for (const l of list) {
    l.cluster.importanceScore = computeImportance(l.cluster, ctx);
  }
  return list;
}

/**
 * The last wire this server instance read successfully. When the database
 * cannot be reached even after dbRead's retry (lib/db/client.ts), the pages
 * serve this — re-ranked against the current clock — instead of an empty
 * "No new stories" homepage. It is only used while it is younger than
 * LAST_GOOD_MAX_AGE_MS; past that, an honest empty state is better than old
 * news presented as current.
 */
export const LAST_GOOD_MAX_AGE_MS = 6 * 3_600_000;
let lastGood: { at: number; rows: DbWireRow[] } | null = null;

/** Test seam. */
export function __resetLastGoodWire(): void {
  lastGood = null;
}

async function readWireRows(): Promise<DbWireRow[] | null> {
  try {
    const rows = await dbReadWire();
    if (rows.length > 0) lastGood = { at: Date.now(), rows };
    return rows;
  } catch (err) {
    if (lastGood && Date.now() - lastGood.at <= LAST_GOOD_MAX_AGE_MS) {
      console.error(
        `[wire] DB read failed; serving the last good wire from ${new Date(lastGood.at).toISOString()}:`,
        err,
      );
      return lastGood.rows;
    }
    console.error("[wire] DB read failed and no recent wire is held:", err);
    return null;
  }
}

/**
 * Load the whole ranked wire once per request (React `cache` dedupes the calls
 * from readWire / readCluster / readSectionSummaries in a single render).
 *
 * PRODUCTION: the wire is the ranked clusters the ingest/cluster jobs persisted
 * to Postgres, plus the authored Eureka explainers and any current editorial
 * pick. If the database is empty or unreachable the wire is just the authored
 * content — it NEVER falls back to invented demo news.
 *
 * DEMO MODE (DEMO_MODE=1, no database rows): the committed fixture wire,
 * date-shifted so the demo looks current.
 */
const loadAll = cache(async (): Promise<LoadedCluster[]> => {
  const byImportance = (a: LoadedCluster, b: LoadedCluster) =>
    b.cluster.importanceScore - a.cluster.importanceScore;

  let live: LoadedCluster[] = [];
  if (isDbConfigured()) {
    const rows = await readWireRows();
    if (rows) {
      // Re-rank against the CURRENT clock, then collapse near-duplicate clusters
      // (same section, title Jaccard ≥ threshold) so a paraphrase never shows
      // twice — the stronger of the pair is the one kept. If the live quotes
      // used for ranking cannot be read, the stored scores stand: a ranking
      // input must never empty the wire.
      let loaded = rows.map(dbLoaded);
      try {
        loaded = await rerankNow(loaded);
      } catch (err) {
        console.error("[wire] re-rank failed; using stored scores:", err);
      }
      live = collapseNearDuplicates(loaded.sort(byImportance));
    }
  }

  if (live.length === 0 && isDemoMode())
    return (await computeDemoWire()).filter(isAllowedStory);

  const liveSlugs = new Set(live.map((l) => l.cluster.slug));
  const [eureka, editorial] = await Promise.all([
    computeEurekaClusters(),
    computeEditorialClusters(),
  ]);
  // Real news leads; the evergreen explainers + curated editorial fall to their
  // natural rank by importance. Stub stories (no brief, no real dek) are hidden
  // so readers never get a two-line "article".
  return [
    ...live,
    ...editorial.filter((l) => !liveSlugs.has(l.cluster.slug)),
    ...eureka.filter((l) => !liveSlugs.has(l.cluster.slug)),
  ]
    .filter(isSubstantive)
    .filter(isAllowedStory)
    .sort(byImportance);
});

async function allClusters(): Promise<WireCluster[]> {
  return (await loadAll()).map((l) => l.cluster);
}

export interface WireFilters {
  topic?: string;
  ticker?: string;
  section?: string;
}

export async function readWire(filters: WireFilters = {}): Promise<WireCluster[]> {
  const clusters = await allClusters();
  return clusters.filter((c) => {
    if (filters.section && c.section !== filters.section) return false;
    if (filters.topic && !c.topics.includes(filters.topic)) return false;
    if (filters.ticker && !c.tickers.includes(filters.ticker.toUpperCase()))
      return false;
    return true;
  });
}

export interface ClusterDetail {
  cluster: WireCluster;
  members: ClusterMember[];
  /** Original, AI-written body synthesised from the story's facts (never source text). */
  body: ArticleBody | null;
}

export async function readCluster(slug: string): Promise<ClusterDetail | null> {
  let loaded = (await loadAll()).find((l) => l.cluster.slug === slug) ?? null;
  // A story older than the wire window is no longer in the lists, but its own
  // page must keep working (existing URLs never break).
  if (!loaded && isDbConfigured()) {
    try {
      const row = await dbReadWireBySlug(slug);
      if (row) loaded = (await rerankNow([dbLoaded(row)]))[0] ?? null;
    } catch (err) {
      console.error("[wire] story read failed:", err);
    }
  }
  // An excluded story has no page (content/exclusions.yaml): 404, not a redirect.
  if (!loaded || !isAllowedStory(loaded)) return null;
  // Fixtures carry authored demo bodies; live stories carry the Groq brief the
  // cluster job persisted. No brief → the UI falls back to the dek + source list.
  return { cluster: loaded.cluster, members: loaded.members, body: loaded.body };
}

export function allTopics(): string[] {
  return [
    "monetary_policy",
    "inflation",
    "energy",
    "earnings",
    "regulation",
    "ipo",
    "private_equity",
    "mergers",
    "gcc",
    "crypto",
  ];
}

/** Section metadata for nav/chips, in file order. */
export function allSections(): SectionConfig[] {
  return loadSections();
}

export interface SectionSummary {
  section: SectionConfig;
  count: number;
  lead: WireCluster | null;
}

/** Per-section counts + lead story, and the financial / non-financial split. */
export async function readSectionSummaries(): Promise<{
  sections: SectionSummary[];
  total: number;
  nonFinancial: number;
  nonFinancialPct: number;
}> {
  const clusters = await allClusters();
  const sections = loadSections().map((section) => {
    const inSection = clusters.filter((c) => c.section === section.id);
    return { section, count: inSection.length, lead: inSection[0] ?? null };
  });
  const total = clusters.length;
  const nonFinancial = clusters.filter((c) => !sectionMeta(c.section).financial).length;
  const nonFinancialPct = total === 0 ? 0 : Math.round((nonFinancial / total) * 100);
  return { sections, total, nonFinancial, nonFinancialPct };
}
