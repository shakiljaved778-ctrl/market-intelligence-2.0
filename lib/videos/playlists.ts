import { loadVideoChannels } from "./channels";

export interface OfficialPlaylist {
  id: string;
  name: string;
  /** The channel's uploads playlist: "UU" + the channel id after its "UC". */
  listId: string;
  /** The newest upload (picture + title), when the macro job has stored it. */
  latest?: { videoId: string; title: string; thumbnailUrl: string } | null;
}

/**
 * Each active channel with a known channel id, as its uploads playlist — the
 * keyless way to show an institution's latest videos (YouTube's own player
 * lists them; owner request, 2026-11-20).
 */
export function officialPlaylists(): OfficialPlaylist[] {
  return loadVideoChannels()
    .filter((c) => c.active && c.channelId)
    .map((c) => ({ id: c.id, name: c.name, listId: `UU${c.channelId!.slice(2)}` }));
}

/**
 * The playlists with each channel's stored newest upload attached (from the
 * macro job's oEmbed refresh). Excluded titles are dropped; with no database
 * or nothing stored, the cards fall back to the drawn design.
 */
export const playlistLatestKey = "videos:playlist-latest";

interface LatestRow {
  channel: string;
  listId: string;
  latestVideoId: string;
  latestTitle: string;
  thumbnailUrl: string;
  /** When the job first saw this upload (KV copy only). */
  seenAt?: string;
}

/**
 * PURE (2026-11-28): channels whose current upload we saw most recently come
 * first; channels with no time keep their registry order, after them.
 */
export function newestFirst<T extends { id: string }>(
  list: T[],
  seenAt: Map<string, string | undefined>,
): T[] {
  const t = (p: T) => Date.parse(seenAt.get(p.id) ?? "") || 0;
  return list
    .map((p, i) => ({ p, i }))
    .sort((a, b) => t(b.p) - t(a.p) || a.i - b.i)
    .map((x) => x.p);
}

/** The stored newest uploads: the KV copy first, the database if KV has none. */
async function storedLatest(): Promise<LatestRow[]> {
  const { cacheGet } = await import("@/lib/cache/swr");
  const cached = await cacheGet<LatestRow[]>(playlistLatestKey);
  if (cached && cached.length > 0) return cached;
  const { isDbConfigured } = await import("@/lib/db/client");
  if (!isDbConfigured()) return [];
  const { dbPlaylistLatest } = await import("@/lib/db/queries/videos");
  return dbPlaylistLatest();
}

export async function readOfficialPlaylists(): Promise<OfficialPlaylist[]> {
  const list = officialPlaylists();
  try {
    const { checkExclusion } = await import("@/lib/curation/exclusions");
    const latest = new Map((await storedLatest()).map((r) => [r.channel, r]));
    const ordered = newestFirst(
      list,
      new Map([...latest.values()].map((r) => [r.channel, r.seenAt])),
    );
    return ordered.map((p) => {
      const r = latest.get(p.id);
      if (
        !r ||
        r.listId !== p.listId ||
        checkExclusion({ texts: [r.latestTitle] }).excluded
      )
        return p;
      return {
        ...p,
        latest: {
          videoId: r.latestVideoId,
          title: r.latestTitle,
          thumbnailUrl: r.thumbnailUrl,
        },
      };
    });
  } catch (err) {
    console.error("[videos] playlist read failed:", err);
    return list;
  }
}
