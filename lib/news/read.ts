import { FIXTURE_ARTICLES, type RawArticle } from "@/fixtures/articles";
import { UNIVERSE } from "@/fixtures/universe";
import { HashEmbedder } from "@/lib/curation/embed";
import { runPipeline, type SluggedCluster } from "@/lib/curation/pipeline";
import type { RankContext } from "@/lib/curation/rank";

/**
 * Read layer for the wire (§13). Computes the ranked clusters deterministically
 * from the fixture wire so /news renders with zero keys. In production the
 * cluster job persists ranked clusters to Postgres and this reads them back;
 * the shape is identical, so the UI is unchanged.
 *
 * Uses the deterministic HashEmbedder and a fixed clock so the demo is stable.
 */
const DEMO_NOW = new Date("2026-09-16T20:00:00.000Z");

function context(): RankContext {
  const tiers: Record<string, string> = {};
  for (const a of FIXTURE_ARTICLES) tiers[a.sourceId] = a.tier;
  const tickerMovePct: Record<string, number> = {};
  for (const row of UNIVERSE) tickerMovePct[row.symbol] = Math.abs(row.changePct);
  return { tiers, tickerMovePct, now: DEMO_NOW };
}

let memo: SluggedCluster[] | null = null;

async function allClusters(): Promise<SluggedCluster[]> {
  if (memo) return memo;
  memo = await runPipeline(
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
  return memo;
}

export interface WireFilters {
  topic?: string;
  ticker?: string;
}

export async function readWire(filters: WireFilters = {}): Promise<SluggedCluster[]> {
  const clusters = await allClusters();
  return clusters.filter((c) => {
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
  cluster: SluggedCluster;
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
