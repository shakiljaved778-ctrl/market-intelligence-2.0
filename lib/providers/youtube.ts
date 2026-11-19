import { z } from "zod";
import { cachePut } from "@/lib/cache/swr";

/**
 * YouTube Data API v3 — short videos from official institutions (owner choice,
 * 2026-11-19). The ONLY place a YouTube API call may be made.
 *
 * Why the API and not the channel RSS feeds: YouTube's robots.txt disallows
 * /feeds/videos.xml (probe run 44620192311), and we never fetch a path
 * robots.txt disallows (§10). The Data API is YouTube's sanctioned access; it
 * needs a free key (`YOUTUBE_API_KEY`, Google Cloud) and costs ~20 of the
 * free 10,000 daily quota units at our cadence.
 *
 * Called only by the scheduled macro job, never on page render; each result is
 * cached in KV with an explicit TTL (§2). We keep references only — video id,
 * title, time, thumbnail URL — and, per the YouTube API Services policies,
 * refresh or delete stored data within 30 days (lib/db/queries/videos.ts).
 */
const API = "https://www.googleapis.com/youtube/v3";
const TIMEOUT_MS = 10_000;
const UPLOADS_TTL_S = 6 * 60 * 60;

export function isYoutubeConfigured(): boolean {
  return Boolean(process.env.YOUTUBE_API_KEY);
}

export interface ChannelVideo {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string;
}

export interface ChannelRef {
  /** One of these identifies the channel. */
  channelId?: string;
  handle?: string;
  username?: string;
  /** YouTube's own title for the channel must be one of these (case-insensitive). */
  expectTitles: string[];
}

const ChannelsResponse = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        snippet: z.object({ title: z.string() }),
        contentDetails: z.object({
          relatedPlaylists: z.object({ uploads: z.string() }),
        }),
      }),
    )
    .default([]),
});

const PlaylistResponse = z.object({
  items: z
    .array(
      z.object({
        snippet: z.object({
          title: z.string(),
          thumbnails: z.record(z.string(), z.object({ url: z.string() })).default({}),
        }),
        contentDetails: z.object({
          videoId: z.string(),
          videoPublishedAt: z.string().optional(),
        }),
      }),
    )
    .default([]),
});

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const UNAVAILABLE = /^(private|deleted) video$/i;

/**
 * Resolve a channel to its uploads playlist — only when YouTube's own title for
 * the channel is one of `expectTitles`, so a wrong id or handle can never put an
 * unrelated channel's videos on the site. Null otherwise.
 */
export function pickUploadsPlaylist(
  body: unknown,
  expectTitles: string[],
): string | null {
  const parsed = ChannelsResponse.safeParse(body);
  if (!parsed.success) return null;
  const ch = parsed.data.items[0];
  if (!ch) return null;
  const norm = (s: string) => s.trim().toLowerCase();
  if (!expectTitles.some((t) => norm(t) === norm(ch.snippet.title))) return null;
  return ch.contentDetails.relatedPlaylists.uploads;
}

/**
 * Playlist items → video references, newest first. Private or deleted videos,
 * bad ids and undated items are skipped — never filled in.
 */
export function parsePlaylistItems(body: unknown): ChannelVideo[] {
  const parsed = PlaylistResponse.safeParse(body);
  if (!parsed.success) return [];
  const out: ChannelVideo[] = [];
  for (const it of parsed.data.items) {
    const id = it.contentDetails.videoId;
    const when = Date.parse(it.contentDetails.videoPublishedAt ?? "");
    const title = it.snippet.title.trim();
    if (
      !VIDEO_ID.test(id) ||
      !Number.isFinite(when) ||
      !title ||
      UNAVAILABLE.test(title)
    )
      continue;
    const t = it.snippet.thumbnails;
    out.push({
      videoId: id,
      title,
      publishedAt: new Date(when).toISOString(),
      thumbnailUrl:
        t.high?.url ?? t.medium?.url ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    });
  }
  return out.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

async function getJson(path: string, params: Record<string, string>): Promise<unknown> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;
  const qs = new URLSearchParams({ ...params, key });
  const res = await fetch(`${API}/${path}?${qs.toString()}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) return null;
  return res.json();
}

/**
 * A channel's latest uploads (up to 10), or [] when unconfigured, the channel
 * does not resolve to the expected institution, or the request fails.
 * Two quota units: one channel lookup, one playlist page.
 */
export async function channelVideos(ref: ChannelRef): Promise<ChannelVideo[]> {
  if (!isYoutubeConfigured()) return [];
  try {
    const lookup: Record<string, string> = { part: "snippet,contentDetails" };
    if (ref.channelId) lookup.id = ref.channelId;
    else if (ref.handle) lookup.forHandle = ref.handle;
    else if (ref.username) lookup.forUsername = ref.username;
    else return [];
    const uploads = pickUploadsPlaylist(
      await getJson("channels", lookup),
      ref.expectTitles,
    );
    if (!uploads) {
      console.warn(
        `[youtube] channel did not resolve to "${ref.expectTitles[0]}"; skipped`,
      );
      return [];
    }
    const videos = parsePlaylistItems(
      await getJson("playlistItems", {
        part: "snippet,contentDetails",
        playlistId: uploads,
        maxResults: "10",
      }),
    );
    await cachePut(`youtube:uploads:${uploads}`, UPLOADS_TTL_S, videos);
    return videos;
  } catch {
    return [];
  }
}
