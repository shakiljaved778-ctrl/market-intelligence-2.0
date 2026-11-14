import { and, eq, gte, inArray, notInArray } from "drizzle-orm";
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
  await supersedeReplacedClusters(ranked);
  return stored;
}

/** How far back a run re-clusters (jobs read the last 48h of articles). */
const RECLUSTER_WINDOW_MS = 48 * 3_600_000;

/**
 * Retire stories a later run has split or merged. A published cluster from the
 * re-clustered window whose slug this run did not produce, and whose articles
 * ALL belong to clusters this run did produce, has been replaced: it is marked
 * "stale" so the wire stops showing it (the wire reads published clusters
 * only). Nothing is deleted; its page redirects to the story that now holds its
 * main article (dbSupersedingSlug). Clusters with any article this run did not
 * cover are left alone. Returns the number retired.
 */
export async function supersedeReplacedClusters(
  ranked: SluggedCluster[],
): Promise<number> {
  const db = getDb();
  if (!db || ranked.length === 0) return 0;
  const current = new Set(ranked.flatMap((c) => c.articleIds));
  const since = new Date(Date.now() - RECLUSTER_WINDOW_MS);
  const candidates = await db
    .select({ id: clusters.id })
    .from(clusters)
    .where(
      and(
        eq(clusters.status, "published"),
        gte(clusters.eventTime, since),
        notInArray(
          clusters.slug,
          ranked.map((c) => c.slug),
        ),
      ),
    );
  if (candidates.length === 0) return 0;
  const links = await db
    .select({
      clusterId: clusterArticles.clusterId,
      articleId: clusterArticles.articleId,
    })
    .from(clusterArticles)
    .where(
      inArray(
        clusterArticles.clusterId,
        candidates.map((c) => c.id),
      ),
    );
  const members = new Map<number, number[]>();
  for (const l of links)
    members.set(l.clusterId, [...(members.get(l.clusterId) ?? []), l.articleId]);
  const replaced = candidates
    .map((c) => c.id)
    .filter((id) => {
      const ids = members.get(id) ?? [];
      return ids.length > 0 && ids.every((a) => current.has(a));
    });
  if (replaced.length === 0) return 0;
  await db
    .update(clusters)
    .set({ status: "stale", lastUpdatedAt: new Date() })
    .where(inArray(clusters.id, replaced));
  console.log(`[cluster] retired ${replaced.length} replaced stories`);
  return replaced.length;
}

/**
 * Word counts of the stored briefs for these clusters (slug -> words). A cluster
 * with no brief is absent from the map.
 */
export async function existingClusterBriefs(
  slugs: string[],
): Promise<Map<string, number>> {
  const have = new Map<string, number>();
  const db = getDb();
  if (!db || slugs.length === 0) return have;
  const rows = await db
    .select({ slug: clusters.slug, briefMd: clusters.briefMd })
    .from(clusters)
    .where(inArray(clusters.slug, slugs));
  for (const r of rows) {
    if (r.briefMd) have.set(r.slug, r.briefMd.split(/\s+/).filter(Boolean).length);
  }
  return have;
}

/** Persist an AI-written brief onto a cluster (original content only, §10/§13). */
export async function setClusterBrief(
  slug: string,
  briefMd: string,
  briefModel: string,
): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.update(clusters).set({ briefMd, briefModel }).where(eq(clusters.slug, slug));
}

/** Slugs among `slugs` whose cluster already has a cover photo (skip re-fetch). */
export async function existingClusterCovers(slugs: string[]): Promise<Set<string>> {
  const have = new Set<string>();
  const db = getDb();
  if (!db || slugs.length === 0) return have;
  const rows = await db
    .select({ slug: clusters.slug, coverUrl: clusters.coverUrl })
    .from(clusters)
    .where(inArray(clusters.slug, slugs));
  for (const r of rows) if (r.coverUrl) have.add(r.slug);
  return have;
}

/** Persist a Pexels cover reference onto a cluster (URL + attribution, §13). */
export async function setClusterCover(
  slug: string,
  coverUrl: string,
  coverCredit: string,
  coverCreditUrl: string,
): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db
    .update(clusters)
    .set({ coverUrl, coverCredit, coverCreditUrl })
    .where(eq(clusters.slug, slug));
}
