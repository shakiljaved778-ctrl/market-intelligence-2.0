import { isFilingFeed } from "./edgar";
import { loadEntities, loadSources } from "./config";
import { classifyRegion, isGccRegion, type Region } from "./region";
import { cosine, type Embedder } from "./embed";
import { stripDateline } from "./normalize";

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
/**
 * Two reports from the SAME feed must clear a higher bar: a single agency rarely
 * files the same event twice, and at 0.5 one agency's unrelated stories from a
 * day (a product week, a chamber forum, a festival) chained into one cluster.
 */
export const SAME_SOURCE_THRESHOLD = 0.7;
export const BOOST_TICKER = 0.3;
export const BOOST_ENTITY = 0.3;
export const BOOST_TOPIC = 0.1;
export const BOOST_CAP = 0.45;
/**
 * Two reports that share NO ticker and NO specific entity merge only on a
 * near-identical text (2026-11-27). The HashEmbedder's character trigrams give
 * any two long English paragraphs a cosine of ~0.45–0.6 (common trigrams such
 * as "the", "ing", "ion" dominate), so at 0.50 unrelated reports chained into
 * one cluster: a Bank of England notice absorbed 13 unrelated reports (a
 * Victorian election piece, raw milk, a Netflix review, French GDP, …) and led
 * the homepage. Same-event coverage almost always shares a ticker or a named
 * entity; without one, only a near-copy of the text counts.
 */
export const NO_EVIDENCE_THRESHOLD = 0.75;

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

/**
 * Entities too broad to show that two reports cover the same event. A country
 * is named by nearly every story from that country's news agency (all Qatar
 * News Agency stories name Qatar), so sharing one must not merge them.
 */
let broadEntities: Set<string> | null = null;
function isBroadEntity(name: string): boolean {
  broadEntities ??= new Set(
    loadEntities()
      .filter((e) => e.kind === "country")
      .map((e) => e.name),
  );
  return broadEntities.has(name);
}

/**
 * Region of a report (lib/curation/region.ts): its own text first, then its
 * source's registered region. Two reports about different places are not one
 * event — in particular a Gulf market report must not be swallowed by a global
 * one ("QSE Index Opens Lower" chaining into "European Stocks Close Lower").
 */
let sourceRegions: Map<string, string> | null = null;
const regionCache = new Map<number, Region>();
function regionOf(a: ClusterInput): Region {
  const hit = regionCache.get(a.id);
  if (hit) return hit;
  sourceRegions ??= new Map(
    loadSources().flatMap((s) => (s.region ? [[s.id, s.region] as const] : [])),
  );
  const r = classifyRegion({
    title: a.headline,
    dek: a.dek,
    sourceRegion: sourceRegions.get(a.sourceId) ?? null,
  });
  regionCache.set(a.id, r);
  return r;
}

/** Reports in different regions, at least one of them in the Gulf. */
function differentGulfRegion(a: ClusterInput, b: ClusterInput): boolean {
  const ra = regionOf(a);
  const rb = regionOf(b);
  return ra !== rb && (isGccRegion(ra) || isGccRegion(rb));
}

/**
 * Overlap boost. A shared TOPIC ("artificial_intelligence", "technology") is a
 * theme, not an event: it only adds weight when the reports also share a
 * ticker or a specific entity. On its own it merged "S. Korea's exports top
 * $1 trillion on AI chip boom" with "Anthropic's record listing" (owner report,
 * 2026-11-20): cosine 0.44 + topic 0.10 cleared the 0.50 bar with nothing
 * specific in common, and the merged story carried Anthropic's ticker.
 */
function boost(a: ClusterInput, b: ClusterInput): number {
  let s = 0;
  if (overlap(a.tickers, b.tickers) > 0) s += BOOST_TICKER;
  const specific = (e: string[]) => e.filter((x) => !isBroadEntity(x));
  if (overlap(specific(a.entities), specific(b.entities)) > 0) s += BOOST_ENTITY;
  if (s > 0 && overlap(a.topics, b.topics) > 0) s += BOOST_TOPIC;
  return Math.min(s, BOOST_CAP);
}

function uniq(values: string[]): string[] {
  return [...new Set(values)];
}

export async function clusterArticles(
  articles: ClusterInput[],
  embedder: Embedder,
): Promise<ClusterResult[]> {
  regionCache.clear();
  const sorted = [...articles].sort(
    (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime(),
  );
  const embeddings = await Promise.all(
    // The agency dateline is dropped: it is shared by every story an agency
    // files from one city, so it made unrelated reports look alike.
    sorted.map((a) => embedder.embed(`${a.headline} ${stripDateline(a.dek ?? "")}`)),
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
        const member = cluster.members[j] as ClusterInput;
        if (differentGulfRegion(article, member)) return;
        const cos = cosine(emb, ce);
        const b = boost(article, member);
        // No shared ticker or specific entity: only a near-copy counts.
        if (b === 0 && cos < NO_EVIDENCE_THRESHOLD) return;
        const c = cos + b;
        // Same feed: count the pair only if it clears the higher bar.
        if (member.sourceId === article.sourceId && c < SAME_SOURCE_THRESHOLD) return;
        // A filing feed lists one company per entry, under templated headlines
        // that look alike: two of its entries are never the same story.
        if (member.sourceId === article.sourceId && isFilingFeed(article.sourceId))
          return;
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
