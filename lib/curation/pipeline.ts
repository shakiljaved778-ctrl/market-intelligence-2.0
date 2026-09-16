import { createHash } from "node:crypto";
import { classify } from "./classify";
import { clusterArticles, type ClusterInput, type ClusterResult } from "./cluster";
import { getEmbedder, type Embedder } from "./embed";
import { rankClusters, type RankContext, type RankedCluster } from "./rank";

/**
 * Curation pipeline (§9 Stages 2–4): classify → cluster → rank. Deterministic
 * given the same inputs and embedder. Runs in the Actions runner over ingested
 * articles, and over fixtures for the zero-key wire.
 */
export interface PipelineArticle {
  id: number;
  sourceId: string;
  trustScore: number;
  headline: string;
  dek: string | null;
  publishedAt: string;
}

export function toClusterInput(a: PipelineArticle): ClusterInput {
  const c = classify(a.headline, a.dek);
  return {
    id: a.id,
    headline: a.headline,
    dek: a.dek,
    publishedAt: a.publishedAt,
    sourceId: a.sourceId,
    trustScore: a.trustScore,
    tickers: c.tickers,
    entities: c.entities,
    topics: c.topics,
  };
}

export function slugFor(cluster: ClusterResult): string {
  const base = cluster.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .split("-")
    .slice(0, 8)
    .join("-");
  const h = createHash("sha1")
    .update(
      cluster.articleIds
        .slice()
        .sort((a, b) => a - b)
        .join(","),
    )
    .digest("hex")
    .slice(0, 6);
  return `${base}-${h}`;
}

export interface SluggedCluster extends RankedCluster {
  slug: string;
}

export async function runPipeline(
  articles: PipelineArticle[],
  ctx: RankContext,
  embedder: Embedder = getEmbedder(),
): Promise<SluggedCluster[]> {
  const inputs = articles.map(toClusterInput);
  const clusters = await clusterArticles(inputs, embedder);
  const ranked = rankClusters(clusters, ctx);
  return ranked.map((c) => ({ ...c, slug: slugFor(c) }));
}
