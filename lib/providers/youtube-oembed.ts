import { z } from "zod";
import { isAllowed } from "@/lib/curation/robots";

/**
 * YouTube oEmbed — the keyless way to show each official channel's latest
 * video with its picture (owner request, 2026-11-20). The ONLY place an
 * oEmbed request may be made. oEmbed is YouTube's public endpoint for sites
 * that embed its videos; robots.txt allows it (probe run 44682813823) and it
 * is checked inside the fetcher (§10). Called only by the scheduled macro job.
 *
 * For a channel's uploads playlist (newest first) oEmbed returns the newest
 * video's thumbnail — which names that video — and an oEmbed of the video
 * gives its title and channel. A video is used only when its channel is the
 * expected institution.
 */
const OEMBED = "https://www.youtube.com/oembed";
const UA = "MizaanBot (+https://www.mizaan.tech/about)";
const TIMEOUT_MS = 8_000;

const OEmbedResponse = z
  .object({
    title: z.string().optional(),
    author_name: z.string().optional(),
    thumbnail_url: z.string().optional(),
  })
  .passthrough();
export type OEmbed = z.infer<typeof OEmbedResponse>;

export interface LatestVideo {
  videoId: string;
  title: string;
  thumbnailUrl: string;
}

/** The video id in a YouTube thumbnail URL (…/vi/<id>/hqdefault.jpg), or null. */
export function videoIdFromThumbnail(url: string | undefined): string | null {
  const m = url?.match(/\/vi(?:_webp)?\/([A-Za-z0-9_-]{11})\//);
  return m ? (m[1] as string) : null;
}

/** PURE: combine the playlist and video oEmbeds into the latest video, or null. */
export function latestFromOEmbeds(
  playlist: OEmbed | null,
  video: OEmbed | null,
  expectAuthors: string[],
): LatestVideo | null {
  const id = videoIdFromThumbnail(playlist?.thumbnail_url);
  if (!id || !video?.title) return null;
  const norm = (s: string) => s.trim().toLowerCase();
  const author = norm(video.author_name ?? "");
  if (!expectAuthors.some((a) => norm(a) === author)) return null;
  return {
    videoId: id,
    title: video.title.trim(),
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  };
}

async function oembed(target: string): Promise<OEmbed | null> {
  const url = `${OEMBED}?url=${encodeURIComponent(target)}&format=json`;
  if (!(await isAllowed(url))) return null;
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const parsed = OEmbedResponse.safeParse(await res.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** The newest upload in a channel's uploads playlist, verified to be the institution's. */
export async function latestUpload(
  listId: string,
  expectAuthors: string[],
): Promise<LatestVideo | null> {
  const playlist = await oembed(`https://www.youtube.com/playlist?list=${listId}`);
  const id = videoIdFromThumbnail(playlist?.thumbnail_url);
  if (!id) return null;
  const video = await oembed(`https://www.youtube.com/watch?v=${id}`);
  return latestFromOEmbeds(playlist, video, expectAuthors);
}
