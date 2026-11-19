import { checkExclusion } from "@/lib/curation/exclusions";
import { dbRecentVideos, type StoredVideo } from "@/lib/db/queries/videos";
import { isDbConfigured } from "@/lib/db/client";
import { channelName } from "./channels";

export interface VideoItem extends StoredVideo {
  channelName: string;
}

/** Videos older than this are not shown (the feeds hold ~15 uploads per channel). */
export const VIDEO_MAX_AGE_DAYS = 60;

/**
 * PURE: the homepage strip — the newest video from each channel first (so one
 * busy channel cannot fill it), then the next newest, at most `size`.
 */
export function pickVideoStrip<T extends { channel: string; publishedAt: string }>(
  newestFirst: T[],
  size: number,
): T[] {
  const firsts: T[] = [];
  const seen = new Set<string>();
  for (const v of newestFirst) {
    if (!seen.has(v.channel)) {
      seen.add(v.channel);
      firsts.push(v);
    }
  }
  const rest = newestFirst.filter((v) => !firsts.includes(v));
  return [...firsts, ...rest]
    .slice(0, size)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

/**
 * Stored official videos, newest first: recent ones only, with the editorial
 * exclusions (content/exclusions.yaml) applied to titles. [] when nothing is
 * stored or the database is unreachable — the strip is then omitted.
 */
export async function readVideos(limit = 24, now = Date.now()): Promise<VideoItem[]> {
  if (!isDbConfigured()) return [];
  let rows: StoredVideo[] = [];
  try {
    rows = await dbRecentVideos(limit * 2);
  } catch (err) {
    console.error("[videos] read failed:", err);
    return [];
  }
  const since = now - VIDEO_MAX_AGE_DAYS * 86_400_000;
  return rows
    .filter((v) => Date.parse(v.publishedAt) >= since)
    .filter((v) => !checkExclusion({ texts: [v.title] }).excluded)
    .slice(0, limit)
    .map((v) => ({ ...v, channelName: channelName(v.channel) }));
}
