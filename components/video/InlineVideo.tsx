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
 * video (a picture to show), leaving out the first `alreadyShown` channels the
 * page already shows elsewhere. It never wraps round to them (owner review,
 * 2026-11-27: the Federal Reserve video appeared in both Watch and World).
 */
export function inlinePlaylists(
  all: OfficialPlaylist[],
  alreadyShown = 0,
): OfficialPlaylist[] {
  return all.slice(alreadyShown).filter((p) => Boolean(p.latest));
}
