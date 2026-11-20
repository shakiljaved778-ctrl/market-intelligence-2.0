import { PlaylistCard } from "@/components/video/PlaylistCard";
import { VideoGrid } from "@/components/video/VideoGrid";
import { sectionMeta } from "@/lib/curation/section";
import type { VideoItem } from "@/lib/videos/read";
import type { OfficialPlaylist } from "@/lib/videos/playlists";

// Muted section tints for the drawn cards — existing tokens only (§12).
const TINTS = ["economy", "markets", "world", "science"];

/**
 * Official videos: individual stored videos when the YouTube Data API is
 * configured, otherwise each institution's latest-uploads playlist (no key).
 */
export function WatchGrid({
  videos,
  playlists,
}: {
  videos: VideoItem[];
  playlists: OfficialPlaylist[];
}) {
  if (videos.length > 0) return <VideoGrid videos={videos} />;
  if (playlists.length === 0) return null;
  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {playlists.map((p, i) => (
          <PlaylistCard
            key={p.id}
            name={p.name}
            listId={p.listId}
            hue={sectionMeta(TINTS[i % TINTS.length]!).hue}
          />
        ))}
      </div>
      <p className="text-ink-3 mt-3 text-[11px]">
        From the institutions&rsquo; official YouTube channels. Mizaan does not host or
        edit these videos; YouTube&rsquo;s player loads only when you press play.
      </p>
    </>
  );
}
