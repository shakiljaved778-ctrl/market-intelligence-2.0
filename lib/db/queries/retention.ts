import { lt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { articles, candlesDaily } from "@/lib/db/schema";

/**
 * Retention (§8): prune `articles` older than 90 days and intraday candles
 * older than 30 days. Free Postgres storage is the binding constraint, so this
 * runs in the EOD job from Phase 1 onward — not as an afterthought.
 *
 * `candles_daily` holds EOD bars we keep; intraday candles live in KV/cache and
 * expire by TTL, so the 30-day prune targets any intraday rows persisted there.
 */
export interface RetentionResult {
  articlesDeleted: number;
  intradayCandlesDeleted: number;
  skipped: boolean;
}

const ARTICLE_RETENTION_DAYS = 90;
const INTRADAY_RETENTION_DAYS = 30;

export async function pruneRetention(now: Date = new Date()): Promise<RetentionResult> {
  const db = getDb();
  if (!db) return { articlesDeleted: 0, intradayCandlesDeleted: 0, skipped: true };

  const articleCutoff = new Date(now);
  articleCutoff.setDate(articleCutoff.getDate() - ARTICLE_RETENTION_DAYS);

  const candleCutoff = new Date(now);
  candleCutoff.setDate(candleCutoff.getDate() - INTRADAY_RETENTION_DAYS);

  const deletedArticles = await db
    .delete(articles)
    .where(lt(articles.publishedAt, articleCutoff))
    .returning({ id: articles.id });

  // Intraday candles are cache-resident; when any are persisted to
  // candles_daily-style storage they are pruned by date here.
  const deletedCandles = await db
    .delete(candlesDaily)
    .where(lt(candlesDaily.date, sql`${candleCutoff.toISOString().slice(0, 10)}`))
    .returning({ symbol: candlesDaily.symbol });

  return {
    articlesDeleted: deletedArticles.length,
    intradayCandlesDeleted: deletedCandles.length,
    skipped: false,
  };
}
