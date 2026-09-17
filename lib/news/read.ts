import { cache } from "react";
import { FIXTURE_ARTICLES, type RawArticle } from "@/fixtures/articles";
import { ARTICLE_BODIES, type ArticleBody } from "@/fixtures/articles-body";
import { COVER_IMAGES } from "@/fixtures/cover-images";
import { UNIVERSE } from "@/fixtures/universe";
import { isDbConfigured } from "@/lib/db/client";
import { dbReadWire, type DbWireRow } from "@/lib/db/queries/wire";
import { HashEmbedder } from "@/lib/curation/embed";
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
const DEMO_NOW = new Date("2026-09-16T20:00:00.000Z");

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
    imageUrl: null,
    imageCredit: null,
  };
  return {
    cluster,
    members: row.members,
    primaryId: row.primaryId,
    body: row.brief ? { md: row.brief.md, model: row.brief.model } : null,
  };
}

/**
 * Load the whole ranked wire once per request (React `cache` dedupes the calls
 * from readWire / readCluster / readSectionSummaries in a single render). Live
 * clusters from Postgres win; fixtures are the fallback.
 */
const loadAll = cache(async (): Promise<LoadedCluster[]> => {
  if (isDbConfigured()) {
    try {
      const rows = await dbReadWire();
      if (rows.length > 0) return rows.map(dbLoaded);
    } catch (err) {
      console.error("[wire] DB read failed, falling back to fixtures:", err);
    }
  }
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
