import { loadVideoChannels } from "./channels";

export interface OfficialPlaylist {
  id: string;
  name: string;
  /** The channel's uploads playlist: "UU" + the channel id after its "UC". */
  listId: string;
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
