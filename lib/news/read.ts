import { FIXTURE_ARTICLES, type RawArticle } from "@/fixtures/articles";
import { COVER_IMAGES } from "@/fixtures/cover-images";
import { UNIVERSE } from "@/fixtures/universe";
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
 * Read layer for the wire (§13). Computes the ranked clusters deterministically
 * from the fixture wire so /news renders with zero keys. In production the
 * cluster job persists ranked clusters to Postgres and this reads them back;
 * the shape is identical, so the UI is unchanged.
 *
 * Uses the deterministic HashEmbedder and a fixed clock so the demo is stable.
 * Each cluster is tagged with a section (deterministic, keyword-driven) and an
 * optional image reference so the wire renders the editorial mix (§13).
 */
const DEMO_NOW = new Date("2026-09-16T20:00:00.000Z");

/** A ranked cluster enriched with its editorial section + cover image. */
export interface WireCluster extends SluggedCluster {
  section: string;
  imageUrl: string | null;
  imageCredit: { credit: string; creditUrl: string } | null;
}

function context(): RankContext {
  const tiers: Record<string, string> = {};
  for (const a of FIXTURE_ARTICLES) tiers[a.sourceId] = a.tier;
  const tickerMovePct: Record<string, number> = {};
  for (const row of UNIVERSE) tickerMovePct[row.symbol] = Math.abs(row.changePct);
  return { tiers, tickerMovePct, now: DEMO_NOW };
}

let memo: WireCluster[] | null = null;

function enrich(cluster: SluggedCluster): WireCluster {
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
  return {
    ...cluster,
    section,
    imageUrl: cover?.url ?? primary?.imageUrl ?? null,
    imageCredit: cover ? { credit: cover.credit, creditUrl: cover.creditUrl } : null,
  };
}

async function allClusters(): Promise<WireCluster[]> {
  if (memo) return memo;
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
  memo = ranked.map(enrich);
  return memo;
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

export interface ClusterMember {
  headline: string;
  sourceName: string;
  url: string;
  publishedAt: string;
  dek: string | null;
}

export interface ClusterDetail {
  cluster: WireCluster;
  members: ClusterMember[];
}

export async function readCluster(slug: string): Promise<ClusterDetail | null> {
  const clusters = await allClusters();
  const cluster = clusters.find((c) => c.slug === slug);
  if (!cluster) return null;
  const byId = new Map<number, RawArticle>(FIXTURE_ARTICLES.map((a) => [a.id, a]));
  const members: ClusterMember[] = cluster.articleIds
    .map((id) => byId.get(id))
    .filter((a): a is RawArticle => Boolean(a))
    .sort(
      (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime(),
    )
    .map((a) => ({
      headline: a.headline,
      sourceName: a.sourceName,
      url: a.url,
      publishedAt: a.publishedAt,
      dek: a.dek,
    }));
  return { cluster, members };
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
