import { VideoCard } from "@/components/video/VideoCard";
import type { VideoItem } from "@/lib/videos/read";

const DAY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Qatar",
});

/** A grid of official videos with the shared provenance note. */
export function VideoGrid({ videos }: { videos: VideoItem[] }) {
  if (videos.length === 0) return null;
  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {videos.map((v) => (
          <VideoCard
            key={v.videoId}
            videoId={v.videoId}
            title={v.title}
            channelName={v.channelName}
            thumbnailUrl={v.thumbnailUrl}
            publishedLabel={DAY.format(new Date(v.publishedAt))}
          />
        ))}
      </div>
      <p className="text-ink-3 mt-3 text-[11px]">
        From the institutions&rsquo; official YouTube channels. Mizaan does not host or
        edit these videos; the player loads from YouTube only when you press play.
      </p>
    </>
  );
}
