import { PlaylistCard } from "@/components/video/PlaylistCard";
import { sectionMeta } from "@/lib/curation/section";
import type { OfficialPlaylist } from "@/lib/videos/playlists";

/**
 * One official-channel video placed between stories (owner request,
 * 2026-11-27: "videos after 3 to 4 articles"). It is the same keyless card as
 * the Watch strip: the channel's newest upload as a picture and title, and
 * YouTube's player loads only when the reader presses play.
 */
export function InlineVideo({ playlist }: { playlist: OfficialPlaylist }) {
  return (
    <aside
      aria-label={`Video from ${playlist.name}`}
      className="border-hairline bg-surface rounded-[8px] border p-4"
    >
      <p className="t-micro text-ink-3 mb-3">Watch · official channel</p>
      <div className="max-w-[640px]">
        <PlaylistCard
          name={playlist.name}
          listId={playlist.listId}
          latest={playlist.latest ?? null}
          hue={sectionMeta("economy").hue}
        />
      </div>
    </aside>
  );
}

/**
 * PURE: the playlists to place between stories — those with a known latest
 * video (a picture to show), starting after the ones the page already shows
 * elsewhere, so the first inline videos are not repeats.
 */
export function inlinePlaylists(
  all: OfficialPlaylist[],
  alreadyShown = 0,
): OfficialPlaylist[] {
  const withPicture = (p: OfficialPlaylist) => Boolean(p.latest);
  return [...all.slice(alreadyShown), ...all.slice(0, alreadyShown)].filter(
    withPicture,
  );
}
