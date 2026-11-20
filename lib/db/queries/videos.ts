import { desc, lt, sql } from "drizzle-orm";
import { dbRead, getDb } from "@/lib/db/client";
import { videoPlaylists, videos } from "@/lib/db/schema";

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

/**
 * Delete references not refreshed in `days` (YouTube API Services policy:
 * stored API data is refreshed or deleted within 30 days).
 */
export async function pruneVideos(days = 30): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db
    .delete(videos)
    .where(lt(videos.fetchedAt, new Date(Date.now() - days * 86_400_000)));
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

export interface StoredPlaylistLatest {
  channel: string;
  listId: string;
  latestVideoId: string;
  latestTitle: string;
  thumbnailUrl: string;
  fetchedAt: string;
}

/** Upsert each channel's newest upload (keyless, via oEmbed). */
export async function persistPlaylistLatest(
  rows: Omit<StoredPlaylistLatest, "fetchedAt">[],
): Promise<number> {
  const db = getDb();
  if (!db || rows.length === 0) return 0;
  await db
    .insert(videoPlaylists)
    .values(rows)
    .onConflictDoUpdate({
      target: videoPlaylists.channel,
      set: {
        listId: sql`excluded.list_id`,
        latestVideoId: sql`excluded.latest_video_id`,
        latestTitle: sql`excluded.latest_title`,
        thumbnailUrl: sql`excluded.thumbnail_url`,
        fetchedAt: sql`now()`,
      },
    });
  return rows.length;
}

/** Each channel's stored newest upload. */
export async function dbPlaylistLatest(): Promise<StoredPlaylistLatest[]> {
  return dbRead("dbPlaylistLatest", async () => {
    const db = getDb();
    if (!db) return [];
    const rows = await db.select().from(videoPlaylists);
    return rows.map((r) => ({
      channel: r.channel,
      listId: r.listId,
      latestVideoId: r.latestVideoId,
      latestTitle: r.latestTitle,
      thumbnailUrl: r.thumbnailUrl,
      fetchedAt: r.fetchedAt.toISOString(),
    }));
  });
}
