import { cosine, type Embedder } from "./embed";

/**
 * Clustering (§9 Stage 3). Greedy online clustering within a rolling 48h window.
 * Similarity = embedding cosine + a ticker/entity/topic overlap boost, so nine
 * outlets covering one Fed decision form ONE cluster, not nine.
 *
 * Tuning (recorded per the gate): score = embedding cosine (0..1) + an overlap
 * boost. With the default HashEmbedder, paraphrase cosine is weak, so a shared
 * ticker (+0.30) or entity (+0.30) — the strongest same-event signal — must
 * dominate; SIM_THRESHOLD = 0.5 then merges same-entity coverage while keeping
 * unrelated stories apart. This is exactly the semantic lift MiniLM provides
 * from the embedding alone: when EMBEDDER=minilm, lower the boosts (≈0.12) and
 * raise SIM_THRESHOLD toward ~0.68 pure cosine. Chosen values + evidence are
 * documented in CLAUDE.md.
 */
export const CLUSTER_WINDOW_MS = 48 * 60 * 60 * 1000;
export const SIM_THRESHOLD = 0.5;
export const BOOST_TICKER = 0.3;
export const BOOST_ENTITY = 0.3;
export const BOOST_TOPIC = 0.1;
export const BOOST_CAP = 0.45;

export interface ClusterInput {
  id: number;
  headline: string;
  dek: string | null;
  publishedAt: string; // ISO
  sourceId: string;
  trustScore: number;
  tickers: string[];
  entities: string[];
  topics: string[];
}

export interface ClusterResult {
  articleIds: number[];
  primaryId: number;
  title: string;
  tickers: string[];
  entities: string[];
  topics: string[];
  sourceIds: string[];
  sourceCount: number;
  eventTime: string;
}

interface WorkingCluster {
  members: ClusterInput[];
  embeddings: number[][];
  lastTime: number;
}

function overlap(a: string[], b: string[]): number {
  const set = new Set(a);
  return b.filter((x) => set.has(x)).length;
}

function boost(a: ClusterInput, b: ClusterInput): number {
  let s = 0;
  if (overlap(a.tickers, b.tickers) > 0) s += BOOST_TICKER;
  if (overlap(a.entities, b.entities) > 0) s += BOOST_ENTITY;
  if (overlap(a.topics, b.topics) > 0) s += BOOST_TOPIC;
  return Math.min(s, BOOST_CAP);
}

function uniq(values: string[]): string[] {
  return [...new Set(values)];
}

export async function clusterArticles(
  articles: ClusterInput[],
  embedder: Embedder,
): Promise<ClusterResult[]> {
  const sorted = [...articles].sort(
    (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime(),
  );
  const embeddings = await Promise.all(
    sorted.map((a) => embedder.embed(`${a.headline} ${a.dek ?? ""}`)),
  );

  const clusters: WorkingCluster[] = [];

  sorted.forEach((article, i) => {
    const emb = embeddings[i] as number[];
    const t = new Date(article.publishedAt).getTime();

    let best: { cluster: WorkingCluster; score: number } | null = null;
    for (const cluster of clusters) {
      if (t - cluster.lastTime > CLUSTER_WINDOW_MS) continue;
      // Compare to the most similar member (single-link) plus overlap boost.
      let sim = 0;
      cluster.embeddings.forEach((ce, j) => {
        const c = cosine(emb, ce) + boost(article, cluster.members[j] as ClusterInput);
        if (c > sim) sim = c;
      });
      if (!best || sim > best.score) best = { cluster, score: sim };
    }

    if (best && best.score >= SIM_THRESHOLD) {
      best.cluster.members.push(article);
      best.cluster.embeddings.push(emb);
      best.cluster.lastTime = Math.max(best.cluster.lastTime, t);
    } else {
      clusters.push({ members: [article], embeddings: [emb], lastTime: t });
    }
  });

  return clusters.map((c): ClusterResult => {
    // Cluster title = headline of the highest-trust source (never synthesised).
    const primary = [...c.members].sort(
      (a, b) => b.trustScore - a.trustScore,
    )[0] as ClusterInput;
    const sourceIds = uniq(c.members.map((m) => m.sourceId));
    return {
      articleIds: c.members.map((m) => m.id),
      primaryId: primary.id,
      title: primary.headline,
      tickers: uniq(c.members.flatMap((m) => m.tickers)),
      entities: uniq(c.members.flatMap((m) => m.entities)),
      topics: uniq(c.members.flatMap((m) => m.topics)),
      sourceIds,
      sourceCount: sourceIds.length,
      eventTime: new Date(
        Math.max(...c.members.map((m) => new Date(m.publishedAt).getTime())),
      ).toISOString(),
    };
  });
}
