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
export async function readOfficialPlaylists(): Promise<OfficialPlaylist[]> {
  const list = officialPlaylists();
  const { isDbConfigured } = await import("@/lib/db/client");
  if (!isDbConfigured()) return list;
  try {
    const { dbPlaylistLatest } = await import("@/lib/db/queries/videos");
    const { checkExclusion } = await import("@/lib/curation/exclusions");
    const latest = new Map((await dbPlaylistLatest()).map((r) => [r.channel, r]));
    return list.map((p) => {
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
