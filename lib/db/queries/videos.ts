import { desc, lt, sql } from "drizzle-orm";
import { dbRead, getDb } from "@/lib/db/client";
import { videos } from "@/lib/db/schema";

export interface StoredVideo {
  videoId: string;
  channel: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string;
}

/** Upsert video references (title/thumbnail can change); returns rows written. */
export async function persistVideos(rows: StoredVideo[]): Promise<number> {
  const db = getDb();
  if (!db || rows.length === 0) return 0;
  await db
    .insert(videos)
    .values(
      rows.map((r) => ({
        videoId: r.videoId,
        channel: r.channel,
        title: r.title,
        publishedAt: new Date(r.publishedAt),
        thumbnailUrl: r.thumbnailUrl,
      })),
    )
    .onConflictDoUpdate({
      target: videos.videoId,
      set: {
        title: sql`excluded.title`,
        thumbnailUrl: sql`excluded.thumbnail_url`,
        fetchedAt: sql`now()`,
      },
    });
  return rows.length;
}

/** Drop references older than `days` (the strip only shows recent videos). */
export async function pruneVideos(days = 90): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db
    .delete(videos)
    .where(lt(videos.publishedAt, new Date(Date.now() - days * 86_400_000)));
}

/** The newest stored videos. */
export async function dbRecentVideos(limit: number): Promise<StoredVideo[]> {
  return dbRead("dbRecentVideos", async () => {
    const db = getDb();
    if (!db) return [];
    const rows = await db
      .select()
      .from(videos)
      .orderBy(desc(videos.publishedAt))
      .limit(limit);
    return rows.map((r) => ({
      videoId: r.videoId,
      channel: r.channel,
      title: r.title,
      publishedAt: r.publishedAt.toISOString(),
      thumbnailUrl: r.thumbnailUrl,
    }));
  });
}
