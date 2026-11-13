import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { dbRead, getDb } from "@/lib/db/client";
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
  /** Source id (content/sources.yaml) of the primary article. */
  primarySourceId: string | null;
  primaryDek: string | null;
  /** AI-written brief persisted by the cluster job, if generated. */
  brief: { md: string; model: string } | null;
  /** Pexels cover photo persisted by the cluster job, if resolved. */
  imageUrl: string | null;
  imageCredit: { credit: string; creditUrl: string } | null;
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

/** How far back the wire reaches. Older stories keep their own page (see
 * `dbReadWireBySlug`) but no longer appear in lists. */
export const WIRE_WINDOW_DAYS = 14;
const WIRE_MAX_CLUSTERS = 400;

/**
 * The recent wire: every published cluster whose event falls inside the window,
 * newest first. Selection is by EVENT TIME, not by the stored importance score —
 * that score is frozen when a story leaves the clustering window, so ordering by
 * it kept weeks-old stories on top. The caller re-ranks with the current clock.
 */
export async function dbReadWire(
  windowDays: number = WIRE_WINDOW_DAYS,
): Promise<DbWireRow[]> {
  const since = new Date(Date.now() - windowDays * 86_400_000);
  return dbRead("dbReadWire", () => readClusters({ since }));
}

/** One story by slug, whatever its age — so old story URLs keep working. */
export async function dbReadWireBySlug(slug: string): Promise<DbWireRow | null> {
  return dbRead(
    "dbReadWireBySlug",
    async () => (await readClusters({ slug }))[0] ?? null,
  );
}

async function readClusters(filter: {
  since?: Date;
  slug?: string;
}): Promise<DbWireRow[]> {
  const db = getDb();
  if (!db) return [];

  const where = filter.slug
    ? and(eq(clusters.status, "published"), eq(clusters.slug, filter.slug))
    : and(
        eq(clusters.status, "published"),
        gte(clusters.eventTime, filter.since ?? new Date(0)),
      );

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
      coverUrl: clusters.coverUrl,
      coverCredit: clusters.coverCredit,
      coverCreditUrl: clusters.coverCreditUrl,
    })
    .from(clusters)
    .where(where)
    .orderBy(desc(clusters.eventTime))
    .limit(WIRE_MAX_CLUSTERS);

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
      primarySourceId: primary.sourceSlug,
      primaryDek: primary.dek,
      brief: c.briefMd ? { md: c.briefMd, model: c.briefModel ?? "groq" } : null,
      imageUrl: c.coverUrl ?? null,
      imageCredit: c.coverUrl
        ? {
            credit: c.coverCredit ?? "Pexels",
            creditUrl: c.coverCreditUrl ?? "https://www.pexels.com",
          }
        : null,
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
