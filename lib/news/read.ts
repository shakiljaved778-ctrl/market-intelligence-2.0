import { cache } from "react";
import { FIXTURE_ARTICLES, type RawArticle } from "@/fixtures/articles";
import { ARTICLE_BODIES, type ArticleBody } from "@/fixtures/articles-body";
import { COVER_IMAGES } from "@/fixtures/cover-images";
import { UNIVERSE } from "@/fixtures/universe";
import { isDbConfigured } from "@/lib/db/client";
import { dbReadWire, type DbWireRow } from "@/lib/db/queries/wire";
import { HashEmbedder } from "@/lib/curation/embed";
import { titleSimilarity, DEFAULT_JACCARD_THRESHOLD } from "@/lib/curation/dedupe";
import { runPipeline, type SluggedCluster } from "@/lib/curation/pipeline";
import type { RankContext } from "@/lib/curation/rank";
import {
  classifySection,
  loadSections,
  sectionMeta,
  type SectionConfig,
} from "@/lib/curation/section";

/**
 * Read layer for the wire (§13). In production the cluster job persists ranked
 * clusters to Postgres and this reads them back (`dbReadWire`). With zero keys
 * (§2) — or if the DB is empty or unreachable — it falls back to computing the
 * ranked clusters deterministically from the fixture wire, so /news always
 * renders. The shape is identical either way, so the UI is unchanged.
 *
 * The fixture path uses the deterministic HashEmbedder and a fixed clock so the
 * demo is stable. Each cluster is tagged with a section (deterministic,
 * keyword-driven) and an optional image reference.
 */
// Rank the fixture wire against a clock pinned just after the newest fixture
// story, so the most recently dated batch always surfaces at the top of the
// wire (older stories age down to the recency floor, exactly like a live wire).
// Previously this was frozen at 2026-09-16, so freshly dated stories got no
// recency credit and ranked far down — added content never reached the
// homepage or the top of /news.
const DEMO_NOW = new Date(
  Math.max(...FIXTURE_ARTICLES.map((a) => new Date(a.publishedAt).getTime())) +
    60 * 60 * 1000,
);

/** A ranked cluster enriched with its editorial section + cover image. */
export interface WireCluster extends SluggedCluster {
  section: string;
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
}

function context(): RankContext {
  const tiers: Record<string, string> = {};
  for (const a of FIXTURE_ARTICLES) tiers[a.sourceId] = a.tier;
  const tickerMovePct: Record<string, number> = {};
  for (const row of UNIVERSE) tickerMovePct[row.symbol] = Math.abs(row.changePct);
  return { tiers, tickerMovePct, now: DEMO_NOW };
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

/** Enrich a fixture-computed cluster with section + cover + members. */
function fixtureLoaded(cluster: SluggedCluster): LoadedCluster {
  const byId = new Map<number, RawArticle>(FIXTURE_ARTICLES.map((a) => [a.id, a]));
  const primary = byId.get(cluster.primaryId);
  const section = classifySection({
    title: cluster.title,
    dek: primary?.dek ?? null,
    topics: cluster.topics,
    tickers: cluster.tickers,
  });
  // Prefer a resolved Pexels cover (committed offline); fall back to any image
  // reference on the article, else null → the UI draws the SVG cover.
  const cover = COVER_IMAGES[cluster.primaryId];
  const wire: WireCluster = {
    ...cluster,
    section,
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
    body: ARTICLE_BODIES[cluster.primaryId] ?? null,
  };
}

/** Build a cluster from a persisted (live) row. Live articles carry no stored
 * image, so the UI draws the deterministic SVG cover. */
function dbLoaded(row: DbWireRow): LoadedCluster {
  const cluster: WireCluster = {
    slug: row.slug,
    title: row.title,
    tickers: row.tickers,
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
      tickers: row.tickers,
    }),
    dek: row.primaryDek,
    imageUrl: row.imageUrl,
    imageCredit: row.imageCredit,
  };
  return {
    cluster,
    members: row.members,
    primaryId: row.primaryId,
    body: row.brief ? { md: row.brief.md, model: row.brief.model } : null,
  };
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

/** Compute the ranked wire deterministically from the fixture articles. */
async function computeFixtureClusters(): Promise<LoadedCluster[]> {
  const ranked = await runPipeline(
    FIXTURE_ARTICLES.map((a) => ({
      id: a.id,
      sourceId: a.sourceId,
      trustScore: a.trustScore,
      headline: a.headline,
      dek: a.dek,
      publishedAt: a.publishedAt,
    })),
    context(),
    new HashEmbedder(),
  );
  return ranked.map(fixtureLoaded);
}

/**
 * Load the whole ranked wire once per request (React `cache` dedupes the calls
 * from readWire / readCluster / readSectionSummaries in a single render).
 *
 * Both sources are merged: the live clusters the ingest/cluster jobs persist to
 * Postgres AND our curated fixture wire (the Eureka explainers plus the wider
 * editorial stories). The fixtures are our own authored content and are never
 * ingested, so without this merge they'd vanish the moment `POSTGRES_URL` is
 * set — which is exactly why added stories weren't showing on the live site.
 * Fixtures are deduped against the live wire by slug and everything is ranked
 * together by importance. With no DB (§2) the fixture wire renders on its own.
 */
const loadAll = cache(async (): Promise<LoadedCluster[]> => {
  if (isDbConfigured()) {
    try {
      const rows = await dbReadWire();
      if (rows.length > 0) {
        // Phase 2 §2: on the LIVE wire, collapse near-duplicate clusters (same
        // section, title Jaccard ≥ threshold) so a paraphrase never shows twice.
        // The curated fixtures below are authored demo content and are exempt, so
        // the zero-key demo is unchanged. (Per-section freshness windows —
        // lib/curation/freshness.ts — gate the homepage/section fronts, not the
        // full /news wire, and are applied at the rendering layer in live mode.)
        const live = collapseNearDuplicates(rows.map(dbLoaded));
        const liveSlugs = new Set(live.map((l) => l.cluster.slug));
        const curated = (await computeFixtureClusters()).filter(
          (l) => !liveSlugs.has(l.cluster.slug),
        );
        if (curated.length === 0) return live;
        const byImportance = (a: LoadedCluster, b: LoadedCluster) =>
          b.cluster.importanceScore - a.cluster.importanceScore;
        // Lead with the freshest curated stories (last 7 days of the fixture
        // wire). Otherwise the live DB clusters — recent, multi-source, high
        // importance — out-rank every fixture and bury newly added content far
        // down the list, so added stories never reach the homepage or the top
        // of /news. Everything else (older curated + the live wire) follows,
        // ranked by importance as before.
        const FRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
        const newest = Math.max(
          ...curated.map((l) => new Date(l.cluster.eventTime).getTime()),
        );
        const fresh = curated
          .filter(
            (l) => newest - new Date(l.cluster.eventTime).getTime() <= FRESH_WINDOW_MS,
          )
          .sort(byImportance);
        const freshSlugs = new Set(fresh.map((l) => l.cluster.slug));
        const rest = [
          ...live,
          ...curated.filter((l) => !freshSlugs.has(l.cluster.slug)),
        ].sort(byImportance);
        return [...fresh, ...rest];
      }
    } catch (err) {
      console.error("[wire] DB read failed, falling back to fixtures:", err);
    }
  }
  return computeFixtureClusters();
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
  const loaded = (await loadAll()).find((l) => l.cluster.slug === slug);
  if (!loaded) return null;
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
