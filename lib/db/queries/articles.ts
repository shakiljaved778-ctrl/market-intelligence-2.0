import { eq, gte, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { articles, clusterArticles, clusters, sources } from "@/lib/db/schema";
import { classify } from "@/lib/curation/classify";
import type { SourceConfig } from "@/lib/curation/config";
import type { NormalizedArticle } from "@/lib/curation/normalize";
import type { PipelineArticle, SluggedCluster } from "@/lib/curation/pipeline";

/**
 * Persistence for the curation engine (§8, §9). Articles are stored with NO
 * body column (enforced by the schema). All functions no-op without a DB.
 */

export async function ensureSources(
  configs: SourceConfig[],
): Promise<Map<string, number>> {
  const db = getDb();
  const map = new Map<string, number>();
  if (!db) return map;
  for (const s of configs) {
    const [row] = await db
      .insert(sources)
      .values({
        slug: s.id,
        name: s.name,
        homepage: s.homepage ?? null,
        feedUrl: s.feed_url,
        kind: s.kind,
        region: s.region ?? null,
        tier: s.tier,
        trustScore: s.trust_score,
        licenseNote: s.license_note,
        active: s.active,
      })
      .onConflictDoUpdate({
        target: sources.slug,
        set: { name: s.name, trustScore: s.trust_score, active: s.active },
      })
      .returning({ id: sources.id });
    if (row) map.set(s.id, row.id);
  }
  return map;
}

export async function persistArticles(
  items: NormalizedArticle[],
  sourceMap: Map<string, number>,
): Promise<number> {
  const db = getDb();
  if (!db || items.length === 0) return 0;
  let stored = 0;
  for (const a of items) {
    const sourceId = sourceMap.get(a.sourceId);
    if (sourceId === undefined) continue;
    const c = classify(a.headline, a.dek);
    const res = await db
      .insert(articles)
      .values({
        sourceId,
        url: a.url,
        canonicalUrl: a.canonicalUrl,
        headline: a.headline,
        dek: a.dek,
        publishedAt: new Date(a.publishedAt),
        author: a.author,
        rawHash: a.rawHash,
        tickers: c.tickers,
        topics: c.topics,
        entities: c.entities,
        status: "new",
        // NO body — the column does not exist (§10).
      })
      .onConflictDoNothing({ target: articles.url })
      .returning({ id: articles.id });
    stored += res.length;
  }
  return stored;
}

/** Recent articles for the cluster stage, joined to their source tier/trust. */
export async function dbRecentArticles(
  sinceHours = 48,
): Promise<(PipelineArticle & { trustScore: number; sourceSlug: string })[]> {
  const db = getDb();
  if (!db) return [];
  const since = new Date(Date.now() - sinceHours * 3_600_000);
  const rows = await db
    .select({
      id: articles.id,
      headline: articles.headline,
      dek: articles.dek,
      publishedAt: articles.publishedAt,
      sourceSlug: sources.slug,
      trustScore: sources.trustScore,
    })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(gte(articles.publishedAt, since));
  return rows.map((r) => ({
    id: r.id,
    sourceId: r.sourceSlug,
    sourceSlug: r.sourceSlug,
    trustScore: r.trustScore,
    headline: r.headline,
    dek: r.dek,
    publishedAt: r.publishedAt.toISOString(),
  }));
}

export async function persistClusters(ranked: SluggedCluster[]): Promise<number> {
  const db = getDb();
  if (!db || ranked.length === 0) return 0;
  let stored = 0;
  for (const c of ranked) {
    const [row] = await db
      .insert(clusters)
      .values({
        slug: c.slug,
        title: c.title,
        primaryTopic: c.topics[0] ?? null,
        tickers: c.tickers,
        eventTime: new Date(c.eventTime),
        importanceScore: c.importanceScore,
        sourceCount: c.sourceCount,
        articleCount: c.articleIds.length,
        lastUpdatedAt: new Date(),
        status: "published",
      })
      .onConflictDoUpdate({
        target: clusters.slug,
        set: {
          importanceScore: c.importanceScore,
          sourceCount: c.sourceCount,
          articleCount: c.articleIds.length,
          lastUpdatedAt: new Date(),
        },
      })
      .returning({ id: clusters.id });
    if (!row) continue;

    // Mark member articles clustered and (re)link them.
    await db
      .update(articles)
      .set({ status: "clustered" })
      .where(inArray(articles.id, c.articleIds));
    for (const articleId of c.articleIds) {
      await db
        .insert(clusterArticles)
        .values({ clusterId: row.id, articleId, isPrimary: articleId === c.primaryId })
        .onConflictDoNothing();
    }
    stored += 1;
  }
  return stored;
}
