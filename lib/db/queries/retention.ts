import { lt } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { articles } from "@/lib/db/schema";

/**
 * Retention (§8): prune `articles` older than 90 days. Free Postgres storage is
 * the binding constraint, so this runs in the EOD job.
 *
 * Daily bars in `candles_daily` are KEPT — they are the quote pages' price
 * history (five years per tracked equity, a few MB in all). Intraday candles
 * are never written to Postgres: they live in KV and expire by TTL, so there is
 * nothing to prune for them. (Until 2026-11-19 this deleted every daily bar
 * older than 30 days, which wiped the stored history each night.)
 */
export interface RetentionResult {
  articlesDeleted: number;
  intradayCandlesDeleted: number;
  skipped: boolean;
}

const ARTICLE_RETENTION_DAYS = 90;

export async function pruneRetention(now: Date = new Date()): Promise<RetentionResult> {
  const db = getDb();
  if (!db) return { articlesDeleted: 0, intradayCandlesDeleted: 0, skipped: true };

  const articleCutoff = new Date(now);
  articleCutoff.setDate(articleCutoff.getDate() - ARTICLE_RETENTION_DAYS);

  const deletedArticles = await db
    .delete(articles)
    .where(lt(articles.publishedAt, articleCutoff))
    .returning({ id: articles.id });

  return {
    articlesDeleted: deletedArticles.length,
    intradayCandlesDeleted: 0,
    skipped: false,
  };
}
