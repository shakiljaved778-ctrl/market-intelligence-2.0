import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { articles, clusterArticles, clusters, sources } from "@/lib/db/schema";

/**
 * Read the ranked, persisted wire back out of Postgres (§9 Stage 4). The
 * cluster job writes `clusters` + `cluster_articles`; this reconstructs the
 * same shape the fixture pipeline produces so `lib/news/read.ts` can serve
 * live clusters with an unchanged UI. No body text is read (§10) — only
 * headline metadata that ingest already stored.
 *
 * Returns [] when the DB is unconfigured or empty, so the caller falls back to
 * the fixture wire.
 */

export interface DbWireMember {
  headline: string;
  sourceName: string;
  url: string;
  publishedAt: string;
  dek: string | null;
}

export interface DbWireRow {
  slug: string;
  title: string;
  tickers: string[];
  topics: string[];
  entities: string[];
  sourceIds: string[];
  sourceCount: number;
  eventTime: string;
  importanceScore: number;
  articleIds: number[];
  primaryId: number;
  primaryDek: string | null;
  /** AI-written brief persisted by the cluster job, if generated. */
  brief: { md: string; model: string } | null;
  members: DbWireMember[];
}

function uniq(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))];
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

export async function dbReadWire(limit = 60): Promise<DbWireRow[]> {
  const db = getDb();
  if (!db) return [];

  const clusterRows = await db
    .select({
      id: clusters.id,
      slug: clusters.slug,
      title: clusters.title,
      primaryTopic: clusters.primaryTopic,
      tickers: clusters.tickers,
      eventTime: clusters.eventTime,
      importanceScore: clusters.importanceScore,
      sourceCount: clusters.sourceCount,
      briefMd: clusters.briefMd,
      briefModel: clusters.briefModel,
    })
    .from(clusters)
    .where(eq(clusters.status, "published"))
    .orderBy(desc(clusters.importanceScore), desc(clusters.lastUpdatedAt))
    .limit(limit);

  if (clusterRows.length === 0) return [];

  const ids = clusterRows.map((c) => c.id);
  const memberRows = await db
    .select({
      clusterId: clusterArticles.clusterId,
      articleId: clusterArticles.articleId,
      isPrimary: clusterArticles.isPrimary,
      headline: articles.headline,
      dek: articles.dek,
      url: articles.url,
      publishedAt: articles.publishedAt,
      tickers: articles.tickers,
      topics: articles.topics,
      entities: articles.entities,
      sourceSlug: sources.slug,
      sourceName: sources.name,
    })
    .from(clusterArticles)
    .innerJoin(articles, eq(clusterArticles.articleId, articles.id))
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(inArray(clusterArticles.clusterId, ids));

  const byCluster = new Map<number, typeof memberRows>();
  for (const m of memberRows) {
    const list = byCluster.get(m.clusterId) ?? [];
    list.push(m);
    byCluster.set(m.clusterId, list);
  }

  const rows: DbWireRow[] = [];
  for (const c of clusterRows) {
    const members = (byCluster.get(c.id) ?? [])
      .slice()
      .sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());
    if (members.length === 0) continue;

    const primary = members.find((m) => m.isPrimary) ?? members[0];
    if (!primary) continue;
    const topics = uniq([c.primaryTopic, ...members.flatMap((m) => m.topics ?? [])]);
    const entities = uniq(members.flatMap((m) => asStringArray(m.entities)));
    const tickers =
      c.tickers && c.tickers.length > 0
        ? c.tickers
        : uniq(members.flatMap((m) => m.tickers ?? []));
    const sourceIds = uniq(members.map((m) => m.sourceSlug));

    rows.push({
      slug: c.slug,
      title: c.title,
      tickers,
      topics,
      entities,
      sourceIds,
      sourceCount: c.sourceCount || sourceIds.length,
      eventTime: (c.eventTime ?? primary.publishedAt).toISOString(),
      importanceScore: c.importanceScore,
      articleIds: members.map((m) => m.articleId),
      primaryId: primary.articleId,
      primaryDek: primary.dek,
      brief: c.briefMd ? { md: c.briefMd, model: c.briefModel ?? "groq" } : null,
      members: members.map((m) => ({
        headline: m.headline,
        sourceName: m.sourceName,
        url: m.url,
        publishedAt: m.publishedAt.toISOString(),
        dek: m.dek,
      })),
    });
  }
  return rows;
}
