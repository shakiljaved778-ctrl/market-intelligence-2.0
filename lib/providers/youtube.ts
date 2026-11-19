import { isAllowed } from "@/lib/curation/robots";

/**
 * YouTube channel feeds — short videos from official institutions (owner
 * choice, 2026-11-19). The ONLY place a YouTube fetch may target the vendor.
 *
 * Each channel's public Atom feed (no key) lists its latest ~15 uploads. It is
 * read only by the scheduled macro job, never on page render, and robots.txt is
 * checked inside the fetcher (§10). We keep only references — video id, title,
 * publish time, thumbnail URL — never a description or transcript; the video
 * itself plays from youtube-nocookie.com only when a reader presses play.
 */
const FEED_URL = "https://www.youtube.com/feeds/videos.xml?channel_id=";
const UA = "MizaanBot (+https://www.mizaan.tech/about)";
const TIMEOUT_MS = 10_000;

export interface ChannelVideo {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string;
  /** Channel name as the feed states it. */
  author: string | null;
}

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1] as string) : null;
}

/**
 * Parse a channel's Atom feed into video references, newest first. Entries
 * without a valid video id, title or date are skipped — never filled in.
 */
export function parseYoutubeFeed(xml: string): ChannelVideo[] {
  const out: ChannelVideo[] = [];
  for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const e = m[1] as string;
    const videoId = tag(e, "yt:videoId");
    const title = tag(e, "title");
    const published = tag(e, "published");
    if (!videoId || !VIDEO_ID.test(videoId) || !title || !published) continue;
    const t = Date.parse(published);
    if (!Number.isFinite(t)) continue;
    const authorBlock = e.match(/<author>([\s\S]*?)<\/author>/)?.[1] ?? "";
    out.push({
      videoId,
      title,
      publishedAt: new Date(t).toISOString(),
      // The standard-size thumbnail on YouTube's image CDN, built from the id.
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      author: tag(authorBlock, "name"),
    });
  }
  return out.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

/** The channel's latest uploads, or [] when robots disallow, the feed fails or is empty. */
export async function channelVideos(channelId: string): Promise<ChannelVideo[]> {
  if (!/^UC[A-Za-z0-9_-]{22}$/.test(channelId)) return [];
  const url = `${FEED_URL}${channelId}`;
  if (!(await isAllowed(url))) return [];
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "application/atom+xml, application/xml" },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return [];
    return parseYoutubeFeed(await res.text());
  } catch {
    return [];
  }
}
